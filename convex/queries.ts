import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

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

    return {
      account,
      seller,
      contacts,
      latestConversation,
      transcript,
      events,
      actions,
      drafts,
    };
  },
});

export const getDealMap = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    return contacts;
  },
});

export const listActivity = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    return events.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getLiveConversation = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const conversation =
      conversations.sort((a, b) => b._creationTime - a._creationTime)[0] ?? null;
    if (!conversation) return null;

    const transcript = await ctx.db
      .query("transcriptLines")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
      .collect();
    transcript.sort((a, b) => a.ts - b.ts);

    return { conversation, transcript };
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

export const getAccountByDomain = query({
  args: { domain: v.string() },
  handler: async (ctx, { domain }) => {
    return await ctx.db
      .query("accounts")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .first();
  },
});

export const listAccounts = query({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    return accounts.sort((a, b) => b._creationTime - a._creationTime);
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

        // Derive the furthest stage reached.
        let stage = "enriched";
        if (latest?.status === "ended") stage = "qualified";
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
