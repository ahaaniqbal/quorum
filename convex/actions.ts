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

// Best-effort real enrichment via Fiber. Returns null on any failure so the
// curated/derived profile is used instead. Never throws.
async function tryFiberCompany(domain: string): Promise<Partial<SeedCompany> | null> {
  const key = process.env.FIBER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.fiber.ai/v1/enrich/company?domain=${domain}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return {
      companyName: data.name ?? undefined,
      industry: data.industry ?? undefined,
      headcount: data.employeeRange ?? data.headcount ?? undefined,
      funding: data.lastFunding ?? undefined,
      techStack: data.techStack ?? undefined,
      signals: data.signals ?? undefined,
    };
  } catch {
    return null;
  }
}

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
    const domain = parseDomain(email);
    const base = KNOWN_COMPANIES[domain] ?? fallbackCompany(domain);

    // Layer real Fiber data over the curated base when available.
    const fiber = await tryFiberCompany(domain);
    const company: SeedCompany = { ...base, ...(fiber ?? {}) };

    // Brand theming: curated colors win; Firecrawl enhances unknown domains.
    let brandColors = company.brandColors;
    let logoUrl = logoForDomain(domain);
    if (!KNOWN_COMPANIES[domain]) {
      const brand = await tryFirecrawlBrand(domain);
      if (brand?.color) brandColors = [brand.color, "#0F0F0F"];
      if (brand?.logoUrl) logoUrl = brand.logoUrl;
    }

    const enrichment = {
      industry: company.industry,
      headcount: company.headcount,
      funding: company.funding,
      revenue: company.revenue,
      techStack: company.techStack,
      signals: company.signals,
      source: fiber ? "fiber" : KNOWN_COMPANIES[domain] ? "curated" : "derived",
    };

    const accountId: string = await ctx.runMutation(api.mutations.createAccount, {
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
      label: `Enriched ${company.companyName} — ${company.funding}, ${company.headcount} employees`,
      payload: enrichment,
    });

    // Primary contact (the prospect who dropped their email).
    const primaryName = nameFromEmail(email);
    const contactId = await ctx.runMutation(api.mutations.addContact, {
      accountId: accountId as any,
      name: primaryName,
      title: "Head of Revenue",
      email,
      role: "champion",
      persona: "Pragmatic, ROI-driven, wants speed-to-value.",
      isPrimary: true,
    });

    await ctx.runMutation(api.mutations.recordEvent, {
      accountId: accountId as any,
      type: "enriched",
      label: `Identified ${primaryName} as primary contact at ${company.companyName}`,
      payload: { contactId },
    });

    await ctx.runMutation(api.mutations.setAccountStatus, {
      accountId: accountId as any,
      status: "active",
    });

    return accountId;
  },
});
