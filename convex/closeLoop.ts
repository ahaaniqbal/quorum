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
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    const account = data?.account;
    const contacts = data?.contacts ?? [];
    const primary = contacts.find((c: any) => c.isPrimary) ?? contacts[0];
    const committee = contacts.filter((c: any) => !c.isPrimary).length;

    let result: { ok: boolean; id?: string } = { ok: false };

    if (type === "slack") {
      result = await execComposio("SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", {
        channel: process.env.SLACK_CHANNEL ?? "#revenue",
        text: `:tada: ${account?.companyName ?? "Account"} qualified — meeting booked. Buying committee of ${committee} mapped. (via Quorum)`,
      });
    } else if (type === "hubspot") {
      result = await execComposio("HUBSPOT_CREATE_CONTACT_OBJECT_WITH_PROPERTIES", {
        email: primary?.email,
        firstname: (primary?.name ?? "").split(" ")[0],
        lastname: (primary?.name ?? "").split(" ").slice(1).join(" "),
        company: account?.companyName,
      });
    } else if (type === "calendar") {
      result = await execComposio("GOOGLECALENDAR_CREATE_EVENT", {
        summary: `Quorum pilot — ${account?.companyName}`,
        description: `Qualification follow-up with ${primary?.name ?? "the prospect"}.`,
        attendees: primary?.email ? [primary.email] : [],
      });
    } else if (type === "email") {
      const sent = await trySendDraftsViaAgentMail(ctx, accountId).catch(() => 0);
      result = sent > 0 ? { ok: true, id: `sent:${sent}` } : { ok: false };
    }

    const status = result.ok ? "done" : "skipped";
    const finalLabel = result.ok ? label : `${label} · connect to enable`;
    await ctx.runMutation(internal.closeLoop.markDone, {
      accountId,
      type,
      label: finalLabel,
      status,
      externalId: result.id,
    });
  },
});

// Execute a Composio tool for real. Returns ok:false when no account is
// connected for that toolkit (the honest "needs connection" state).
async function execComposio(
  slug: string,
  args: any
): Promise<{ ok: boolean; id?: string }> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return { ok: false };
  try {
    const res = await fetch(`https://backend.composio.dev/api/v3/tools/execute/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ user_id: "default", arguments: args }),
    });
    const j: any = await res.json().catch(() => ({}));
    if (res.ok && j?.successful !== false && !j?.error) {
      return { ok: true, id: String(j?.data?.ts ?? j?.data?.id ?? "ok") };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

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
      label: a.status === "done" ? `✓ ${a.label}` : a.label,
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
      label: "Action loop complete",
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

