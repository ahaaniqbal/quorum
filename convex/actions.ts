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

export const enrichFromEmail = action({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<string> => {
    const domain = parseDomain(email);
    const base = KNOWN_COMPANIES[domain] ?? fallbackCompany(domain);

    // Layer real Fiber data over the curated base when available.
    const fiber = await tryFiberCompany(domain);
    const company: SeedCompany = { ...base, ...(fiber ?? {}) };

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
      logoUrl: logoForDomain(domain),
      brandColors: company.brandColors,
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
