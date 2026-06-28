"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
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

export const enrichFromEmail = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
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
    if (osValid && os!.followers! > 1000)
      signals.unshift(`${Math.round(os!.followers! / 1000)}K LinkedIn followers`);

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

    const accountId: string = await ctx.runMutation(api.mutations.createAccount, {
      userId: userId ?? undefined,
      domain,
      companyName: company.companyName,
      enrichment,
      logoUrl,
      brandColors,
      summary: company.summary,
    });

    await ctx.runMutation(api.mutations.recordEvent, {
      accountId: accountId as any,
      type: "enriched",
      label: `${fiber ? "Fiber enriched" : "Enriched"} ${company.companyName} — ${company.funding}, ${company.headcount} employees`,
      payload: enrichment,
    });

    if (osValid) {
      const bits = [
        os!.followers ? `${os!.followers.toLocaleString()} LinkedIn followers` : null,
        os!.foundedYear ? `founded ${os!.foundedYear}` : null,
        os!.hq ? `HQ ${os!.hq}` : null,
      ].filter(Boolean);
      await ctx.runMutation(api.mutations.recordEvent, {
        accountId: accountId as any,
        type: "enriched",
        label: `Orange Slice: LinkedIn snapshot — ${bits.join(" · ")}`,
        payload: { source: "orangeslice" },
      });
    }

    // Primary contact — real identity via Fiber email-to-person when available.
    const primaryName = person?.name ?? nameFromEmail(email);
    const primaryTitle = person?.title || "Head of Revenue";
    const contactId = await ctx.runMutation(api.mutations.addContact, {
      accountId: accountId as any,
      name: primaryName,
      title: primaryTitle,
      email,
      role: "champion",
      persona: "Pragmatic, ROI-driven, wants speed-to-value.",
      enrichment: person ? { linkedin: person.linkedin, headline: person.headline } : undefined,
      isPrimary: true,
    });

    await ctx.runMutation(api.mutations.recordEvent, {
      accountId: accountId as any,
      type: "enriched",
      label: person
        ? `Fiber reverse-lookup: ${email} → ${primaryName}, ${primaryTitle}`
        : `Identified ${primaryName} as primary contact at ${company.companyName}`,
      payload: { contactId },
    });

    await ctx.runMutation(api.mutations.setAccountStatus, {
      accountId: accountId as any,
      status: "active",
    });

    return accountId;
  },
});
