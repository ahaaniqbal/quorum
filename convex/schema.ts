import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  accounts: defineTable({
    domain: v.string(),
    companyName: v.string(),
    enrichment: v.any(), // raw enrichment payload (Fiber / getleads)
    logoUrl: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    status: v.string(), // "new" | "active" | "committee_mapped" | "actioned"
    summary: v.optional(v.string()),
  }).index("by_domain", ["domain"]),

  contacts: defineTable({
    accountId: v.id("accounts"),
    name: v.string(),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.string(), // "champion" | "economic_buyer" | "technical" | "user" | "unknown"
    persona: v.optional(v.string()),
    status: v.string(), // "not_contacted" | "contacted" | "engaged" | "booked"
    enrichment: v.optional(v.any()),
    isPrimary: v.boolean(),
  }).index("by_account", ["accountId"]),

  conversations: defineTable({
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    channel: v.string(), // "voice" | "email"
    status: v.string(), // "live" | "ended"
    summary: v.optional(v.string()),
    qualification: v.optional(v.any()), // {budget, authority, need, timing, score}
    vapiCallId: v.optional(v.string()),
  }).index("by_account", ["accountId"]),

  transcriptLines: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "rep" | "prospect"
    text: v.string(),
    ts: v.number(),
  }).index("by_conversation", ["conversationId"]),

  events: defineTable({
    accountId: v.id("accounts"),
    type: v.string(),
    label: v.string(),
    payload: v.optional(v.any()),
  }).index("by_account", ["accountId"]),

  actions: defineTable({
    accountId: v.id("accounts"),
    contactId: v.optional(v.id("contacts")),
    type: v.string(), // "slack" | "hubspot" | "calendar" | "email"
    status: v.string(), // "pending" | "done" | "failed"
    label: v.string(),
    externalId: v.optional(v.string()),
  }).index("by_account", ["accountId"]),

  drafts: defineTable({
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    subject: v.string(),
    body: v.string(),
    persona: v.string(),
    status: v.string(), // "draft" | "sent"
  }).index("by_account", ["accountId"]),
});
