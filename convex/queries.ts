import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAccountFull = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return null;

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
