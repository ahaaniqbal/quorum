import { mutation, internalMutation, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

// Fires the cross-tool action loop. Each action lights up pending → done with a
// stagger for visual effect. Slack hits Composio for real when a key is present;
// everything else simulates (and is trivially swapped for real Composio calls).
export const fireActions = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) throw new Error("Account not found");
    const company = account.companyName;

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const committeeCount = contacts.filter((c) => !c.isPrimary).length;

    const defs = [
      { type: "slack", label: `Slack → #revenue: ${company} qualified, meeting booked` },
      { type: "hubspot", label: `HubSpot: deal created — ${company} pilot` },
      { type: "calendar", label: `Calendar: invite sent — Thursday 11:00am` },
      {
        type: "email",
        label: `Outreach sent to ${committeeCount} committee members`,
      },
    ];

    await ctx.db.insert("events", {
      accountId,
      type: "action_fired",
      label: "Closing the loop — firing actions across the stack…",
    });

    let t = 250;
    for (const d of defs) {
      // Light up as pending immediately.
      const existing = contacts; // (re-use query above; actions are upserted below)
      void existing;
      const prior = await ctx.db
        .query("actions")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .filter((q) => q.eq(q.field("type"), d.type))
        .first();
      if (prior) {
        await ctx.db.patch(prior._id, { status: "pending", label: d.label });
      } else {
        await ctx.db.insert("actions", {
          accountId,
          type: d.type,
          status: "pending",
          label: d.label,
        });
      }

      await ctx.scheduler.runAfter(t, internal.closeLoop.complete, {
        accountId,
        type: d.type,
        label: d.label,
      });
      t += 700;
    }

    await ctx.scheduler.runAfter(t + 200, internal.closeLoop.finish, { accountId });
  },
});

export const complete = internalAction({
  args: { accountId: v.id("accounts"), type: v.string(), label: v.string() },
  handler: async (ctx, { accountId, type, label }) => {
    let externalId: string | undefined;
    let status = "done";

    if (type === "slack" && process.env.COMPOSIO_API_KEY) {
      const res = await trySlackViaComposio(label).catch(() => null);
      if (res?.id) externalId = res.id;
    }

    if (type === "email" && process.env.AGENTMAIL_API_KEY) {
      const sent = await trySendDraftsViaAgentMail(ctx, accountId).catch(() => 0);
      if (sent > 0) externalId = `sent:${sent}`;
    }

    await ctx.runMutation(internal.closeLoop.markDone, {
      accountId,
      type,
      label,
      status,
      externalId,
    });
  },
});

export const markDone = internalMutation({
  args: {
    accountId: v.id("accounts"),
    type: v.string(),
    label: v.string(),
    status: v.string(),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const prior = await ctx.db
      .query("actions")
      .withIndex("by_account", (q) => q.eq("accountId", a.accountId))
      .filter((q) => q.eq(q.field("type"), a.type))
      .first();
    if (prior) {
      await ctx.db.patch(prior._id, {
        status: a.status,
        label: a.label,
        ...(a.externalId ? { externalId: a.externalId } : {}),
      });
    }
    await ctx.db.insert("events", {
      accountId: a.accountId,
      type: "action_fired",
      label: `✓ ${a.label}`,
    });
  },
});

export const finish = internalMutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    await ctx.db.patch(accountId, { status: "actioned" });
    await ctx.db.insert("events", {
      accountId,
      type: "action_fired",
      label: "Loop closed — every action fired across the stack",
    });
    // Sync the account brain to HydraDB (best-effort; no-op without a key).
    await ctx.scheduler.runAfter(300, internal.hydra.ingest, { accountId });
  },
});

// Best-effort real email send via AgentMail: send each drafted committee email
// from an agent inbox, mark the draft sent. Returns count sent. Never throws.
async function trySendDraftsViaAgentMail(ctx: any, accountId: any): Promise<number> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return 0;
  const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
  if (!data) return 0;
  const inbox = process.env.AGENTMAIL_INBOX ?? "quorum@agentmail.to";
  let sent = 0;
  for (const draft of data.drafts ?? []) {
    if (draft.status === "sent") continue;
    const contact = data.contacts.find((c: any) => c._id === draft.contactId);
    if (!contact?.email) continue;
    try {
      const res = await fetch(`https://api.agentmail.to/v0/inboxes/${inbox}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ to: contact.email, subject: draft.subject, text: draft.body }),
      });
      if (res.ok) {
        await ctx.runMutation(api.mutations.setDraftStatus, {
          draftId: draft._id,
          status: "sent",
        });
        sent++;
      }
    } catch {
      // skip this one
    }
  }
  return sent;
}

// Best-effort real Slack message via Composio. Endpoint/tool shape is wrapped in
// try/catch; on any failure the action still completes (simulated). Wire the
// exact Composio tool slug here once the connection is pre-authorized.
async function trySlackViaComposio(text: string): Promise<{ id: string } | null> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://backend.composio.dev/api/v2/actions/SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        input: { channel: process.env.SLACK_CHANNEL ?? "#revenue", text },
      }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return { id: j?.data?.ts ?? j?.id ?? "sent" };
  } catch {
    return null;
  }
}
