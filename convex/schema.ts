import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // The signed-in user's workspace profile (their company + what they sell).
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    companyName: v.string(),
    product: v.string(), // what they sell (one line)
    valueProp: v.optional(v.string()),
    icp: v.optional(v.string()), // ideal customer profile
    onboarded: v.boolean(),
    ingestToken: v.optional(v.string()), // secret for the inbound webhook
  })
    .index("by_user", ["userId"])
    .index("by_ingestToken", ["ingestToken"]),

  accounts: defineTable({
    userId: v.optional(v.id("users")), // owner (the seller)
    domain: v.string(),
    companyName: v.string(),
    enrichment: v.any(), // raw enrichment payload (Fiber / getleads)
    logoUrl: v.optional(v.string()),
    brandColors: v.optional(v.array(v.string())),
    status: v.string(), // "new" | "active" | "committee_mapped" | "actioned"
    summary: v.optional(v.string()),
    // ── Deal brain (the intelligence layer) ──
    memory: v.optional(v.any()), // Memory Synthesis output (account_summary, deal_facts, person_updates…)
    graph: v.optional(v.any()), // Committee Inference output (stakeholders, relationships, gaps)
    moves: v.optional(v.any()), // Next-Move Engine output (deal_status, deal_risk, top_move, moves)
  })
    .index("by_domain", ["domain"])
    .index("by_user", ["userId"]),

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

  agentRuns: defineTable({
    accountId: v.id("accounts"),
    userId: v.optional(v.id("users")),
    trigger: v.string(), // "manual" | "bulk_ingest" | "webhook" | "review" | "demo"
    goal: v.string(),
    status: v.string(), // "running" | "completed" | "blocked" | "failed"
    summary: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_account", ["accountId"])
    .index("by_user", ["userId"]),

  agentSteps: defineTable({
    runId: v.id("agentRuns"),
    accountId: v.id("accounts"),
    agent: v.string(), // "ingest" | "research" | "committee" | "brain" | "outreach" | "actions"
    type: v.string(), // "tool_call" | "reasoning" | "draft" | "approval_gate" | "external_action"
    status: v.string(), // "running" | "completed" | "blocked" | "failed"
    label: v.string(),
    detail: v.optional(v.string()),
    tool: v.optional(v.string()),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_run", ["runId"])
    .index("by_account", ["accountId"]),

  actions: defineTable({
    accountId: v.id("accounts"),
    contactId: v.optional(v.id("contacts")),
    type: v.string(), // "slack" | "hubspot" | "calendar" | "email"
    status: v.string(), // "pending" | "done" | "failed"
    label: v.string(),
    externalId: v.optional(v.string()),
    system: v.optional(v.string()),
    confidence: v.optional(v.number()),
    risk: v.optional(v.string()),
    requirements: v.optional(v.array(v.string())),
    audit: v.optional(v.any()),
  }).index("by_account", ["accountId"]),

  drafts: defineTable({
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    subject: v.string(),
    body: v.string(),
    persona: v.string(),
    status: v.string(), // "draft" | "sent"
    confidence: v.optional(v.number()),
    rationale: v.optional(v.any()),
  }).index("by_account", ["accountId"]),
});
