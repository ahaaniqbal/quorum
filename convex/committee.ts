import { action, mutation, internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { committeeForDomain } from "./lib/seed";
import { fiberCommittee } from "./lib/fiber";

const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  technical: "Technical",
  user: "End User",
};

// Maps the rest of the buying committee. Uses real Fiber AI people-search
// (c-suite + founders at the company domain); falls back to curated/verified
// decision-makers if Fiber is unavailable. Members pop in one-by-one via the
// scheduler for a live "finding the room" feel.
export const mapCommittee = action({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<number> => {
    const access: any = await ctx.runQuery(internal.authz.assertAccountAccess, { accountId });
    const runId: string = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId,
      userId: access.userId ?? undefined,
      trigger: "manual",
      goal: `Map the buying committee for ${access.account.companyName}`,
    });
    try {
      const mapped = await ctx.runAction(internal.committee.mapCommitteeAutonomous, { accountId });
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId: runId as any,
        accountId,
        agent: "committee",
        type: "reasoning",
        status: mapped > 0 ? "completed" : "blocked",
        label: mapped > 0 ? "Committee mapping scheduled" : "No verified committee found",
        detail:
          mapped > 0
            ? "The committee agent found likely buying roles and scheduled verified contacts into the account brain."
            : "Quorum paused before inventing stakeholders because no verified committee members were available.",
        tool: "Fiber people-search + committee mapper",
        output: { mapped },
      });
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: mapped > 0 ? "completed" : "blocked",
        summary:
          mapped > 0
            ? `Mapped ${mapped} stakeholder${mapped === 1 ? "" : "s"} for ${access.account.companyName}.`
            : `No verified committee members found for ${access.account.companyName}; account remains grounded to known contacts.`,
      });
      return mapped;
    } catch (error: any) {
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId: runId as any,
        accountId,
        agent: "committee",
        type: "reasoning",
        status: "failed",
        label: "Committee mapping failed",
        detail: error?.message ?? "Unknown committee mapping error.",
        error: error?.message ?? "Unknown error",
      });
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: "failed",
        summary: `Committee mapping failed for ${access.account.companyName}.`,
      });
      throw error;
    }
  },
});

export const mapCommitteeAutonomous = internalAction({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<number> => {
    // Unguarded load so this runs both for the signed-in autopilot and for
    // server-side autonomous ingestion (no auth context). Account IDs are
    // unguessable; the reactive dashboard query stays tenant-guarded.
    const data: any = await ctx.runQuery(internal.brain.getBrainData, { accountId });
    if (!data) throw new Error("Account not found");
    const account = data.account;

    const fiber = await fiberCommittee(account.domain);
    const usedFiber = Boolean(fiber && fiber.length);
    const members = usedFiber
      ? fiber!
      : committeeForDomain(account.domain, account.companyName);

    if (members.length === 0) {
      await ctx.runMutation(internal.committee.recordMapStart, {
        accountId,
        label: `No verified committee members found for ${account.companyName}. Keeping the account grounded to known contacts only.`,
      });
      await ctx.scheduler.runAfter(400, internal.brain.runBrainChain, { accountId });
      return 0;
    }

    await ctx.runMutation(internal.committee.recordMapStart, {
      accountId,
      label: `${usedFiber ? "Fiber people-search:" : "Mapping"} the buying committee at ${account.companyName}…`,
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
        profilePic: m.profilePic,
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

export const recordMapStart = internalMutation({
  args: { accountId: v.id("accounts"), label: v.string() },
  handler: async (ctx, { accountId, label }) => {
    await ctx.db.insert("events", { accountId, type: "committee_mapped", label });
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
    profilePic: v.optional(v.string()),
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
      enrichment:
        a.linkedin || a.profilePic
          ? { linkedin: a.linkedin, profilePic: a.profilePic }
          : undefined,
    });

    await ctx.db.insert("events", {
      accountId: a.accountId,
      type: "committee_mapped",
      label: `Found ${a.name}: ${a.title} · ${ROLE_LABEL[a.role] ?? "Stakeholder"}`,
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
      label: `Buying committee mapped: ${count} decision-makers identified`,
    });
    // Build the committee graph + next moves from the people we just found.
    await ctx.scheduler.runAfter(400, internal.brain.runBrainChain, { accountId });
  },
});
