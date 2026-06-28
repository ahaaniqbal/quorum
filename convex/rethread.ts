import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// The memory beat, for real: a known committee member re-engages, and Quorum
// threads them into the SAME account brain, the new conversation carries real
// prior context (earlier call summary + mapped committee), injected by
// voice.priorContext into the rep's system prompt. No scripted lines.
export const startRethread = action({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<string> => {
    const access: any = await ctx.runQuery(internal.authz.assertAccountAccess, { accountId });
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    if (!data?.account) throw new Error("Account not found");
    const runId: string = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId,
      userId: access.userId ?? undefined,
      trigger: "manual",
      goal: `Rethread a committee member into ${data.account.companyName}'s existing account brain`,
    });

    const committee = data.contacts.filter((c: any) => !c.isPrimary);
    const target =
      committee.find((c: any) => c.status !== "booked" && c.status !== "engaged") ??
      committee[0] ??
      data.contacts.find((c: any) => c.isPrimary);
    if (!target) throw new Error("No contact to re-thread");

    await ctx.runMutation(internal.rethread.recordRethread, {
      accountId,
      label: `${target.name} (${target.title ?? "committee"}) from ${data.account.companyName} re-engaged, threaded into the existing account brain with full prior context`,
    });

    // A real AI conversation that already knows the account, the prior call,
    // and the committee (via voice.priorContext).
    const conversationId: string = await ctx.runAction(api.voice.startCall, {
      contactId: target._id,
    });
    await ctx.runMutation(internal.agentTrace.recordStep, {
      runId: runId as any,
      accountId,
      agent: "brain",
      type: "reasoning",
      status: "completed",
      label: "Known stakeholder rethreaded",
      detail: "Quorum selected a committee member and started a new AI call with prior account context injected.",
      tool: "account memory + AI voice rep",
      output: {
        contact: target.name,
        conversationId,
        committeeSize: committee.length,
      },
    });
    await ctx.runMutation(internal.agentTrace.completeRun, {
      runId: runId as any,
      status: "completed",
      summary: `Rethreaded ${target.name} into ${data.account.companyName}'s existing account brain.`,
    });
    return conversationId;
  },
});

export const recordRethread = internalMutation({
  args: { accountId: v.id("accounts"), label: v.string() },
  handler: async (ctx, { accountId, label }) => {
    await ctx.db.insert("events", { accountId, type: "rethread", label });
  },
});
