import {
  action,
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Work a single inbound lead end-to-end, with no human in the loop:
// enrich → map the committee → (brain chain auto-runs) → draft outreach.
// This is what makes "100 inbounds" a non-event: each one arrives fully worked.
export const workLead = internalAction({
  args: { userId: v.id("users"), email: v.string() },
  handler: async (ctx, { userId, email }): Promise<void> => {
    let runId: string | null = null;
    const accountId: string = await ctx.runAction(api.actions.enrichFromEmail, {
      email,
      asUserId: userId,
    });
    runId = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId: accountId as any,
      userId,
      trigger: "inbound",
      goal: `Work ${email} end-to-end until review or action handoff`,
    });
    await ctx.runMutation(internal.agentTrace.recordStep, {
      runId: runId as any,
      accountId: accountId as any,
      agent: "ingest",
      type: "tool_call",
      status: "completed",
      label: "Lead accepted and account enriched",
      detail: "Quorum resolved the company, firmographic context, and source metadata before queueing the account brain.",
      tool: "enrichment",
      input: { email },
      output: { accountId },
    });
    // Maps the committee (staggered inserts) and, via finishMapping, fires the
    // deal-brain chain (graph + next moves).
    const mapped = await ctx.runAction(internal.committee.mapCommitteeAutonomous, { accountId: accountId as any });
    await ctx.runMutation(internal.agentTrace.recordStep, {
      runId: runId as any,
      accountId: accountId as any,
      agent: "committee",
      type: "reasoning",
      status: mapped > 0 ? "completed" : "blocked",
      label: mapped > 0 ? "Buying committee mapped" : "Committee needs human confirmation",
      detail:
        mapped > 0
          ? "The committee agent identified verified stakeholders and triggered the account brain synthesis."
          : "The committee agent could not verify enough stakeholders to draft safely.",
      tool: "committee mapper",
      output: { mapped },
    });
    // Draft once verified committee members have landed. If no one is verified,
    // keep the account grounded and wait for a call/manual confirmation.
    if (mapped > 0) {
      await ctx.scheduler.runAfter(8000, internal.outreach.generateOutreachAutonomous, {
        accountId: accountId as any,
      });
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId: runId as any,
        accountId: accountId as any,
        agent: "outreach",
        type: "draft",
        status: "completed",
        label: "Persona outreach drafting scheduled",
        detail: "The outreach agent will draft customer-facing emails for review before anything sends.",
        tool: "outreach generator",
        output: { scheduledAfterMs: 8000 },
      });
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: "completed",
        summary: `Worked ${email}: enriched account, mapped ${mapped} stakeholder${mapped === 1 ? "" : "s"}, and scheduled outreach drafts.`,
      });
    } else {
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: "blocked",
        summary: `Worked ${email}: enriched account but paused because no verified committee members were safe to draft against.`,
      });
    }
  },
});

// Batch ingest from the UI: paste / connect a list of inbound emails and Quorum
// fans out and works every one. Returns how many were queued.
export const bulkIngest = mutation({
  args: { emails: v.array(v.string()) },
  handler: async (ctx, { emails }): Promise<{ queued: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const seen = new Set<string>();
    const clean = emails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e) && !seen.has(e) && (seen.add(e), true))
      .slice(0, 50);
    // Cascade so accounts stream into the pipeline rather than landing all at once.
    let t = 0;
    for (const email of clean) {
      await ctx.scheduler.runAfter(t, internal.inbound.workLead, { userId, email });
      t += 700;
    }
    return { queued: clean.length };
  },
});

// ── Inbound webhook plumbing (forms / CRM / email forwarding) ─────────────────

export const _tokenFor = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return p?.ingestToken ?? null;
  },
});

export const _setToken = internalMutation({
  args: { userId: v.id("users"), token: v.string() },
  handler: async (ctx, { userId, token }) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (p) await ctx.db.patch(p._id, { ingestToken: token });
  },
});

// Mint (once) the per-workspace secret that the inbound webhook URL carries.
export const ensureIngestToken = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing: string | null = await ctx.runQuery(internal.inbound._tokenFor, { userId });
    if (existing) return existing;
    const token = "qrm_" + crypto.randomUUID().replace(/-/g, "");
    await ctx.runMutation(internal.inbound._setToken, { userId, token });
    return token;
  },
});

// The webhook URL for the signed-in workspace (null until a token is minted).
export const getIngestInfo = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const token = p?.ingestToken ?? null;
    const base = process.env.CONVEX_SITE_URL ?? "";
    return { token, url: token ? `${base}/inbound?token=${token}` : null };
  },
});

// Resolve an inbound token to its workspace owner. Used by the HTTP webhook.
export const resolveToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_ingestToken", (q) => q.eq("ingestToken", token))
      .first();
    return p?.userId ?? null;
  },
});
