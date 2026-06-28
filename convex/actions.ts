"use node";

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import {
  KNOWN_COMPANIES,
  parseDomain,
  fallbackCompany,
  logoForDomain,
  nameFromEmail,
  type SeedCompany,
} from "./lib/seed";
import { fiberEmailToPerson, fiberCompany } from "./lib/fiber";
import { orangeSliceCompany } from "./lib/orangeslice";
import { openaiChat } from "./lib/openai";
import { getAuthUserId } from "@convex-dev/auth/server";

// Best-effort brand extraction via Firecrawl: scrape the homepage and pull a
// theme color + logo. Returns null on any failure. Never throws.
async function tryFirecrawlBrand(
  domain: string
): Promise<{ color?: string; logoUrl?: string } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ url: `https://${domain}`, formats: ["html"] }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const html: string = j?.data?.html ?? "";
    const meta = j?.data?.metadata ?? {};
    const themeColor =
      html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["'](#[0-9a-fA-F]{6})["'][^>]+name=["']theme-color["']/i)?.[1];
    const logoUrl = meta.ogImage ?? meta.favicon ?? undefined;
    if (!themeColor && !logoUrl) return null;
    return { color: themeColor, logoUrl };
  } catch {
    return null;
  }
}

// Scrape the homepage as text (title + description + main content) for the
// seller-profile autofill. Returns a trimmed snippet, or null on any failure.
async function tryFirecrawlText(domain: string): Promise<string | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        url: `https://${domain}`,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const j: any = await res.json();
    const meta = j?.data?.metadata ?? {};
    const text = `${meta.title ?? ""}\n${meta.description ?? meta.ogDescription ?? ""}\n${
      j?.data?.markdown ?? ""
    }`.trim();
    return text ? text.slice(0, 3500) : null;
  } catch {
    return null;
  }
}

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com",
  "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com",
  "zoho.com", "hey.com", "fastmail.com",
]);

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeName(value: string | undefined | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function sameCompanyName(a: string | undefined, b: string | undefined): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

function isTinyCompany(headcount: string | undefined): boolean {
  if (!headcount) return false;
  const nums = headcount.match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  if (!nums.length) return false;
  return Math.max(...nums) <= 10;
}

function shouldDefaultFounder(title: string | undefined, headcount: string | undefined): boolean {
  if (!isTinyCompany(headcount)) return false;
  if (!title) return true;
  return /head of revenue|sales|growth|marketing|business development/i.test(title);
}

// Read the seller's OWN company from their business-email domain and synthesize
// the onboarding fields (company, what you sell, value prop, ICP). Pre-fill
// only; the user reviews and edits before saving. Returns null for free/personal
// domains (nothing to infer) so the UI just leaves the form blank.
export const autofillSeller = action({
  args: { email: v.string() },
  handler: async (
    ctx,
    { email }
  ): Promise<{
    companyName: string;
    product: string;
    valueProp: string;
    icp: string;
    domain: string;
    source: string;
  } | null> => {
    const domain = parseDomain(email);
    if (!domain || FREE_EMAIL_DOMAINS.has(domain)) return null;

    const [website, fiber, os] = await Promise.all([
      tryFirecrawlText(domain),
      fiberCompany(domain).catch(() => null),
      orangeSliceCompany(domain).catch(() => null),
    ]);

    const nameGuess =
      fiber?.companyName ?? titleCase(domain.split(".")[0]);

    // No signal at all → still hand back the company name so the field isn't empty.
    if (!website && !fiber?.summary && !os?.description) {
      return { companyName: nameGuess, product: "", valueProp: "", icp: "", domain, source: "domain" };
    }

    const context = [
      `Company domain: ${domain}`,
      fiber?.companyName && `Known name: ${fiber.companyName}`,
      fiber?.industry && `Industry: ${fiber.industry}`,
      fiber?.summary && `Company summary: ${fiber.summary}`,
      os?.description && `LinkedIn description: ${os.description}`,
      website && `Website content:\n${website}`,
    ]
      .filter(Boolean)
      .join("\n");

    let out: any = null;
    const raw = await openaiChat(
      [
        {
          role: "system",
          content:
            'You fill out a sales tool\'s seller profile from public signals about a company. Return ONLY strict JSON: {"companyName":"","product":"","valueProp":"","icp":""}. product = one tight line on what they sell. valueProp = one line on the core outcome/benefit. icp = one line on who they sell to (segment, size). Base everything strictly on the signals provided; if a field is genuinely unclear, return an empty string for it. Never invent specific metrics or customers.',
        },
        { role: "user", content: context },
      ],
      { json: true, maxTokens: 300 }
    );
    if (raw) {
      try {
        out = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim());
      } catch {
        /* fall through to name-only */
      }
    }

    return {
      companyName: out?.companyName || nameGuess,
      product: out?.product ?? "",
      valueProp: out?.valueProp ?? "",
      icp: out?.icp ?? "",
      domain,
      source: website ? "website" : fiber ? "fiber" : os ? "linkedin" : "domain",
    };
  },
});

export const enrichFromEmail = action({
  args: { email: v.string(), asUserId: v.optional(v.id("users")) },
  handler: async (ctx, { email, asUserId }): Promise<string> => {
    // A signed-in caller always wins (can't be spoofed). asUserId is only honored
    // when there is no auth context, i.e. server-side ingestion via the scheduler
    // or the inbound webhook, which resolve the owner from a token.
    // Reject malformed input before it becomes a junk account/contact.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      throw new Error("Enter a valid work email address.");
    }
    const authed = await getAuthUserId(ctx);
    const userId = authed ?? asUserId ?? null;
    const domain = parseDomain(email);
    const isKnown = Boolean(KNOWN_COMPANIES[domain]);
    const base = KNOWN_COMPANIES[domain] ?? fallbackCompany(domain);

    // Real enrichment, in parallel: Fiber reverse-lookup + company, and an
    // Orange Slice LinkedIn snapshot (complementary social/firmographic signal).
    const [person, fiber, os] = await Promise.all([
      fiberEmailToPerson(email),
      fiberCompany(domain),
      orangeSliceCompany(domain),
    ]);

    // Layer real Fiber company data over the curated/derived base.
    const company: SeedCompany = {
      ...base,
      ...(fiber
        ? {
            companyName: fiber.companyName ?? base.companyName,
            industry: fiber.industry ?? base.industry,
            headcount: fiber.headcount ?? base.headcount,
            funding: fiber.funding ?? base.funding,
            revenue: fiber.revenue ?? base.revenue,
            techStack: fiber.techStack?.length ? fiber.techStack : base.techStack,
            signals: fiber.signals?.length ? fiber.signals : base.signals,
            summary: fiber.summary ?? base.summary,
          }
        : {}),
    };

    // Brand theming: curated colors win; Firecrawl/Fiber enhance unknown domains.
    let brandColors = company.brandColors;
    let logoUrl = fiber?.logoUrl ?? logoForDomain(domain);
    if (!isKnown) {
      const brand = await tryFirecrawlBrand(domain);
      if (brand?.color) brandColors = [brand.color, "#0F0F0F"];
      if (brand?.logoUrl) logoUrl = brand.logoUrl;
    }

    // Orange Slice domain→LinkedIn match can be noisy; only trust a clearly
    // real snapshot (substantial follower count).
    const osValid = Boolean(os && (os.followers ?? 0) >= 1000);

    // Fold the Orange Slice LinkedIn snapshot into signals + firmographics.
    const signals = [...(company.signals ?? [])];
    if (osValid && os!.followers)
      signals.unshift(`${Math.round(os!.followers / 1000)}K LinkedIn followers`);

    const source = fiber ? "fiber" : isKnown ? "curated" : "derived";
    const enrichment = {
      industry: company.industry,
      headcount: company.headcount,
      funding: company.funding,
      revenue: company.revenue,
      techStack: company.techStack,
      signals,
      founded: osValid ? os!.foundedYear : undefined,
      hq: osValid ? os!.hq : undefined,
      linkedin: osValid ? os!.linkedinUrl : undefined,
      sources: [fiber && "Fiber", osValid && "Orange Slice"].filter(Boolean),
      source,
    };

    const accountId: string = await ctx.runMutation(internal.mutations.createAccount, {
      userId: userId ?? undefined,
      domain,
      companyName: company.companyName,
      enrichment,
      logoUrl,
      brandColors,
      summary: company.summary,
    });

    await ctx.runMutation(internal.mutations.recordEvent, {
      accountId: accountId as any,
      type: "enriched",
      label: `${fiber ? "Fiber enriched" : "Enriched"} ${company.companyName}: ${company.funding}, ${company.headcount} employees`,
      payload: enrichment,
    });

    if (osValid) {
      const bits = [
        os!.followers ? `${os!.followers.toLocaleString()} LinkedIn followers` : null,
        os!.foundedYear ? `founded ${os!.foundedYear}` : null,
        os!.hq ? `HQ ${os!.hq}` : null,
      ].filter(Boolean);
      await ctx.runMutation(internal.mutations.recordEvent, {
        accountId: accountId as any,
        type: "enriched",
        label: `Orange Slice: LinkedIn snapshot: ${bits.join(" · ")}`,
        payload: { source: "orangeslice" },
      });
    }

    // Primary contact: only trust Fiber person details when the current company
    // matches the enriched account. For tiny startups, a missing/generic title is
    // more safely modeled as founder than as a revenue executive.
    const trustedPerson = person && sameCompanyName(person.companyName, company.companyName)
      ? person
      : null;
    const primaryName = trustedPerson?.name ?? nameFromEmail(email);
    const rawPrimaryTitle = trustedPerson?.title;
    const primaryTitle = shouldDefaultFounder(rawPrimaryTitle, company.headcount)
      ? "Founder"
      : rawPrimaryTitle || "Primary contact";
    const contactId = await ctx.runMutation(internal.mutations.addContact, {
      accountId: accountId as any,
      name: primaryName,
      title: primaryTitle,
      email,
      role: "champion",
      persona: "Pragmatic, ROI-driven, wants speed-to-value.",
      enrichment: trustedPerson
        ? { linkedin: trustedPerson.linkedin, headline: trustedPerson.headline, profilePic: trustedPerson.profilePic }
        : undefined,
      isPrimary: true,
    });

    await ctx.runMutation(internal.mutations.recordEvent, {
      accountId: accountId as any,
      type: "enriched",
      label: trustedPerson
        ? `Fiber reverse-lookup: ${email} → ${primaryName}, ${primaryTitle}`
        : `Identified ${primaryName} as primary contact at ${company.companyName}`,
      payload: { contactId },
    });

    await ctx.runMutation(internal.mutations.setAccountStatus, {
      accountId: accountId as any,
      status: "active",
    });

    return accountId;
  },
});
