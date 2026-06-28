import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { buildRethreadScript } from "./lib/callScript";

// The memory kicker: a second person from the same company arrives. Quorum
// recognizes the account, threads them into the existing brain, and advances the
// deal — referencing the prior call and the mapped committee — instead of
// starting cold.
export const startRethread = mutation({
  args: {
    accountId: v.id("accounts"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, name, title, email }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const prior = contacts.find((c) => c.isPrimary) ?? contacts[0];
    const technical =
      contacts.find((c) => c.role === "technical") ??
      contacts.find((c) => !c.isPrimary);

    const priorFirst = prior?.name.split(" ")[0] ?? "your colleague";
    const technicalName = technical?.name ?? "your engineering lead";
    const technicalTitle = technical?.title ?? "technical lead";

    const newName = name ?? "Sarah Patel";
    const newTitle = title ?? "VP Revenue Operations";
    const newEmail = email ?? `sarah.patel@${account.domain}`;
    const newFirst = newName.split(" ")[0];

    // Don't duplicate if this person is already on the account.
    let contactId = contacts.find((c) => c.email === newEmail)?._id;
    if (!contactId) {
      contactId = await ctx.db.insert("contacts", {
        accountId,
        name: newName,
        title: newTitle,
        email: newEmail,
        role: "champion",
        persona: "Owns the RevOps rollout; pragmatic, wants the team threaded.",
        status: "engaged",
        isPrimary: false,
        enrichment: { newInbound: true },
      });
    }

    await ctx.db.insert("events", {
      accountId,
      type: "rethread",
      label: `New inbound: ${newName} (${newTitle}) from ${account.companyName} — account recognized, threaded into existing brain`,
    });
    await ctx.db.insert("events", {
      accountId,
      type: "rethread",
      label: `Prior context loaded: qualified call with ${priorFirst}, meeting booked Thursday, committee mapped`,
    });

    const conversationId = await ctx.db.insert("conversations", {
      accountId,
      contactId,
      channel: "voice",
      status: "live",
    });
    await ctx.db.insert("events", {
      accountId,
      type: "call_started",
      label: `Re-thread call connected with ${newName} — advancing the existing deal`,
    });

    const script = buildRethreadScript({
      companyName: account.companyName,
      newFirst,
      priorFirst,
      technicalName,
      technicalTitle,
    });

    let t = 700;
    for (const step of script) {
      t += step.gapMs;
      await ctx.scheduler.runAfter(t, internal.voice.appendLine, {
        conversationId,
        accountId,
        role: step.role,
        text: step.text,
        qual: step.qual ?? undefined,
        milestone: step.milestone ?? undefined,
      });
    }
    await ctx.scheduler.runAfter(t + 1200, internal.rethread.finishRethread, {
      conversationId,
      accountId,
      contactId,
      newName,
    });

    return conversationId;
  },
});

export const finishRethread = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    newName: v.string(),
  },
  handler: async (ctx, { conversationId, accountId, contactId, newName }) => {
    await ctx.db.patch(conversationId, {
      status: "ended",
      summary: `${newName} threaded into the existing deal with full prior context. Added to Thursday's pilot call alongside the original contact. The account advanced instead of restarting.`,
    });
    await ctx.db.patch(contactId, { status: "booked" });
    await ctx.db.insert("events", {
      accountId,
      type: "rethread",
      label: `Deal advanced — ${newName} added to the same brain, not a cold restart`,
    });
  },
});
