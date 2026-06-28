import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { committeeForDomain } from "./lib/seed";

const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  technical: "Technical",
  user: "End User",
};

// Maps the rest of the buying committee. Uses real, verified decision-makers
// (getleads) for known demo domains; synthesizes a plausible committee otherwise.
// Members pop in one-by-one via the scheduler for a live "finding the room" feel.
export const mapCommittee = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");

    const members = committeeForDomain(account.domain, account.companyName);

    await ctx.db.insert("events", {
      accountId,
      type: "committee_mapped",
      label: `Mapping the buying committee at ${account.companyName}…`,
    });

    let t = 350;
    for (const m of members) {
      await ctx.scheduler.runAfter(t, internal.committee.addMember, {
        accountId,
        name: m.name,
        title: m.title,
        email: m.email,
        role: m.role,
        persona: m.persona,
        linkedin: m.linkedin,
      });
      t += 750;
    }
    await ctx.scheduler.runAfter(t + 300, internal.committee.finishMapping, {
      accountId,
      count: members.length,
    });

    return members.length;
  },
});

export const addMember = internalMutation({
  args: {
    accountId: v.id("accounts"),
    name: v.string(),
    title: v.string(),
    email: v.string(),
    role: v.string(),
    persona: v.string(),
    linkedin: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    // Avoid duplicates if mapping is re-run.
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", a.accountId))
      .filter((q) => q.eq(q.field("email"), a.email))
      .first();
    if (existing) return;

    await ctx.db.insert("contacts", {
      accountId: a.accountId,
      name: a.name,
      title: a.title,
      email: a.email,
      role: a.role,
      persona: a.persona,
      status: "not_contacted",
      isPrimary: false,
      enrichment: a.linkedin ? { linkedin: a.linkedin } : undefined,
    });

    await ctx.db.insert("events", {
      accountId: a.accountId,
      type: "committee_mapped",
      label: `Found ${a.name} — ${a.title} · ${ROLE_LABEL[a.role] ?? "Stakeholder"}`,
    });
  },
});

export const finishMapping = internalMutation({
  args: { accountId: v.id("accounts"), count: v.number() },
  handler: async (ctx, { accountId, count }) => {
    await ctx.db.patch(accountId, { status: "committee_mapped" });
    await ctx.db.insert("events", {
      accountId,
      type: "committee_mapped",
      label: `Buying committee mapped — ${count} decision-makers identified`,
    });
  },
});
