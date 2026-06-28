import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createAccount = mutation({
  args: {
    userId: v.optional(v.id("users")),
    domain: v.string(),
    companyName: v.string(),
    enrichment: v.any(),
    logoUrl: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Dedupe per owner so two users can each have the same domain.
    if (args.userId) {
      const mine = await ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      const existing = mine.find((a) => a.domain === args.domain);
      if (existing) return existing._id;
    } else {
      const existing = await ctx.db
        .query("accounts")
        .withIndex("by_domain", (q) => q.eq("domain", args.domain))
        .first();
      if (existing) return existing._id;
    }
    return await ctx.db.insert("accounts", { ...args, status: "new" });
  },
});

export const setAccountStatus = mutation({
  args: { accountId: v.id("accounts"), status: v.string() },
  handler: async (ctx, { accountId, status }) => {
    await ctx.db.patch(accountId, { status });
  },
});

export const setAccountSummary = mutation({
  args: { accountId: v.id("accounts"), summary: v.string() },
  handler: async (ctx, { accountId, summary }) => {
    await ctx.db.patch(accountId, { summary });
  },
});

export const addContact = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.string(),
    persona: v.optional(v.string()),
    enrichment: v.optional(v.any()),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("contacts", { ...args, status: "not_contacted" });
  },
});

export const setContactStatus = mutation({
  args: { contactId: v.id("contacts"), status: v.string() },
  handler: async (ctx, { contactId, status }) => {
    await ctx.db.patch(contactId, { status });
  },
});

export const createConversation = mutation({
  args: {
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    channel: v.string(),
    vapiCallId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", { ...args, status: "live" });
  },
});

export const endConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { conversationId, summary }) => {
    await ctx.db.patch(conversationId, { status: "ended", ...(summary ? { summary } : {}) });
  },
});

export const appendTranscriptLine = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.string(),
    text: v.string(),
    ts: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("transcriptLines", args);
  },
});

export const setQualification = mutation({
  args: { conversationId: v.id("conversations"), qualification: v.any() },
  handler: async (ctx, { conversationId, qualification }) => {
    await ctx.db.patch(conversationId, { qualification });
  },
});

export const recordEvent = mutation({
  args: {
    accountId: v.id("accounts"),
    type: v.string(),
    label: v.string(),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

export const upsertAction = mutation({
  args: {
    accountId: v.id("accounts"),
    contactId: v.optional(v.id("contacts")),
    type: v.string(),
    status: v.string(),
    label: v.string(),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("actions")
      .withIndex("by_account", (q) => q.eq("accountId", args.accountId))
      .filter((q) => q.eq(q.field("type"), args.type))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        label: args.label,
        ...(args.externalId ? { externalId: args.externalId } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert("actions", args);
  },
});

export const addDraft = mutation({
  args: {
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    subject: v.string(),
    body: v.string(),
    persona: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("drafts", { ...args, status: "draft" });
  },
});

export const setDraftStatus = mutation({
  args: { draftId: v.id("drafts"), status: v.string() },
  handler: async (ctx, { draftId, status }) => {
    await ctx.db.patch(draftId, { status });
  },
});
