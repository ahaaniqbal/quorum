import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const startRun = internalMutation({
  args: {
    accountId: v.id("accounts"),
    userId: v.optional(v.id("users")),
    trigger: v.string(),
    goal: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentRuns", {
      ...args,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

export const recordStep = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    accountId: v.id("accounts"),
    agent: v.string(),
    type: v.string(),
    status: v.string(),
    label: v.string(),
    detail: v.optional(v.string()),
    tool: v.optional(v.string()),
    input: v.optional(v.any()),
    output: v.optional(v.any()),
    externalId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("agentSteps", {
      ...args,
      startedAt: now,
      completedAt: args.status === "running" ? undefined : now,
    });
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("agentRuns"),
    status: v.union(v.literal("completed"), v.literal("blocked"), v.literal("failed")),
    summary: v.string(),
  },
  handler: async (ctx, { runId, status, summary }) => {
    await ctx.db.patch(runId, {
      status,
      summary,
      completedAt: Date.now(),
    });
  },
});

export const listForAccount = query({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return [];
    const userId = await getAuthUserId(ctx);
    if (account.userId && account.userId !== userId) return [];

    const runs = await ctx.db
      .query("agentRuns")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    runs.sort((a, b) => b.startedAt - a.startedAt);

    return await Promise.all(
      runs.map(async (run) => {
        const steps = await ctx.db
          .query("agentSteps")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect();
        steps.sort((a, b) => a.startedAt - b.startedAt);
        return { ...run, steps };
      })
    );
  },
});
