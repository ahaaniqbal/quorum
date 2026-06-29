import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { buildAccountIntelligence } from "./lib/intelligence";

export const getAccountFull = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return null;
    // Tenant guard: only the owner may view a scoped account.
    const userId = await getAuthUserId(ctx);
    if (account.userId && account.userId !== userId) return null;

    const seller = account.userId
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", account.userId!))
          .first()
      : null;

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const latestConversation =
      conversations.sort((a, b) => b._creationTime - a._creationTime)[0] ?? null;

    let transcript: any[] = [];
    if (latestConversation) {
      transcript = await ctx.db
        .query("transcriptLines")
        .withIndex("by_conversation", (q) => q.eq("conversationId", latestConversation._id))
        .collect();
      transcript.sort((a, b) => a.ts - b.ts);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    events.sort((a, b) => b._creationTime - a._creationTime);

    const actions = await ctx.db
      .query("actions")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();

    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();

    const agentRuns = await ctx.db
      .query("agentRuns")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    agentRuns.sort((a, b) => b.startedAt - a.startedAt);
    const agentRunsWithSteps = await Promise.all(
      agentRuns.map(async (run) => {
        const steps = await ctx.db
          .query("agentSteps")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect();
        steps.sort((a, b) => a.startedAt - b.startedAt);
        return { ...run, steps };
      })
    );

    return {
      account,
      seller,
      contacts,
      latestConversation,
      transcript,
      events,
      actions,
      drafts,
      agentRuns: agentRunsWithSteps,
      intelligence: buildAccountIntelligence({
        account,
        contacts,
        latestConversation,
        drafts,
        actions,
      }),
    };
  },
});

// The public demo "hero" account (Ramp) used by "Try a sample company".
export const getSampleAccountId = query({
  args: {},
  handler: async (ctx) => {
    const ramps = await ctx.db
      .query("accounts")
      .withIndex("by_domain", (q) => q.eq("domain", "ramp.com"))
      .collect();
    const demo = ramps.find((a) => a.userId === undefined);
    return demo?._id ?? null;
  },
});

// Pipeline board: the signed-in user's accounts + public demo accounts.
export const listPipeline = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const all = await ctx.db.query("accounts").collect();
    const accounts = all.filter(
      (a) => a.userId === undefined || a.userId === userId
    );
    const rows = await Promise.all(
      accounts.map(async (account) => {
        const contacts = await ctx.db
          .query("contacts")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();
        const conversations = await ctx.db
          .query("conversations")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();
        const latest = conversations.sort(
          (a, b) => b._creationTime - a._creationTime
        )[0];
        const drafts = await ctx.db
          .query("drafts")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();
        const actions = await ctx.db
          .query("actions")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();
        const events = await ctx.db
          .query("events")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .collect();
        const lastEvent = events.sort((a, b) => b._creationTime - a._creationTime)[0];

        const committee = contacts.filter((c) => !c.isPrimary).length;
        const score = latest?.qualification?.score ?? null;
        const booked = Boolean(latest?.qualification?.booked);
        const actioned =
          account.status === "actioned" ||
          actions.some((a) => a.status === "done");

        // Derive the furthest stage reached. Voice qualification is a signal,
        // not a pipeline spine stage; score/booked carry that detail.
        let stage = "enriched";
        if (committee > 0) stage = "committee";
        if (drafts.length > 0) stage = "outreach";
        if (actioned) stage = "actioned";

        return {
          _id: account._id,
          isDemo: account.userId === undefined,
          companyName: account.companyName,
          domain: account.domain,
          logoUrl: account.logoUrl,
          brandColors: account.brandColors,
          enrichment: account.enrichment,
          status: account.status,
          stage,
          score,
          booked,
          committee,
          contactCount: contacts.length,
          lastActivity: lastEvent?._creationTime ?? account._creationTime,
          lastLabel: lastEvent?.label ?? "Enriched",
          createdAt: account._creationTime,
        };
      })
    );
    return rows.sort((a, b) => b.lastActivity - a.lastActivity);
  },
});

export const listReviewQueue = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    // The review gate is the signed-in user's OWN pending decisions. Demo/sample
    // accounts are read-only showcases (visible in the pipeline, not actionable
    // here), so they never appear as approvable items in someone's queue.
    const accounts = userId
      ? await ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect()
      : [];

    const draftRows: any[] = [];
    const actionRows: any[] = [];

    for (const account of accounts) {
      const contacts = await ctx.db
        .query("contacts")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      const contactById = new Map(contacts.map((contact) => [String(contact._id), contact]));

      const drafts = await ctx.db
        .query("drafts")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      for (const draft of drafts) {
        const contact = contactById.get(String(draft.contactId));
        draftRows.push({
          ...draft,
          account: {
            _id: account._id,
            companyName: account.companyName,
            domain: account.domain,
            logoUrl: account.logoUrl,
          },
          contact: contact
            ? {
                _id: contact._id,
                name: contact.name,
                title: contact.title,
                email: contact.email,
                role: contact.role,
                status: contact.status,
              }
            : null,
        });
      }

      const actions = await ctx.db
        .query("actions")
        .withIndex("by_account", (q) => q.eq("accountId", account._id))
        .collect();
      for (const action of actions) {
        if (!["pending", "failed", "skipped"].includes(action.status)) continue;
        actionRows.push({
          ...action,
          account: {
            _id: account._id,
            companyName: account.companyName,
            domain: account.domain,
            logoUrl: account.logoUrl,
          },
        });
      }
    }

    draftRows.sort((a, b) => b._creationTime - a._creationTime);
    actionRows.sort((a, b) => b._creationTime - a._creationTime);

    return {
      drafts: draftRows,
      actions: actionRows,
      counts: {
        pendingDrafts: draftRows.filter((draft) => draft.status === "draft").length,
        approvedDrafts: draftRows.filter((draft) => draft.status === "approved").length,
        skippedDrafts: draftRows.filter((draft) => draft.status === "skipped").length,
        sentDrafts: draftRows.filter((draft) => draft.status === "sent").length,
        actionIssues: actionRows.length,
      },
    };
  },
});
