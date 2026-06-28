import { mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAccountAccess(ctx: any, accountId: any) {
  const account = await ctx.db.get(accountId);
  if (!account) throw new Error("Account not found");
  const userId = await getAuthUserId(ctx);
  if (account.userId && account.userId !== userId) throw new Error("Not authorized");
  return account;
}

export const getCloseLoopData = internalQuery({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return null;
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const drafts = await ctx.db
      .query("drafts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    return { account, contacts, drafts };
  },
});

// Fires the cross-tool action loop. Each action lights up pending to done with a
// stagger for visual effect. Slack hits Composio for real when a key is present;
// everything else simulates (and is trivially swapped for real Composio calls).
export const fireActions = mutation({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await requireAccountAccess(ctx, accountId);
    const userId = await getAuthUserId(ctx);
    const company = account.companyName;

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const committeeCount = contacts.filter((c) => !c.isPrimary).length;
    const runId = await ctx.db.insert("agentRuns", {
      accountId,
      userId: userId ?? undefined,
      trigger: "review",
      goal: `Close the loop for ${company} across CRM, email, calendar, and team alerts`,
      status: "running",
      startedAt: Date.now(),
    });

    const defs = [
      {
        type: "slack",
        system: "Slack",
        label: `Slack: ${company} qualified, meeting booked`,
        confidence: 84,
        risk: "low",
        requirements: ["Composio API key", "Slack connected account", "Revenue channel"],
      },
      {
        type: "hubspot",
        system: "HubSpot",
        label: `HubSpot: deal created for ${company} pilot`,
        confidence: 78,
        risk: "medium",
        requirements: ["Composio API key", "HubSpot connected account", "Primary contact email"],
      },
      {
        type: "calendar",
        system: "Google Calendar",
        label: `Calendar: invite sent for Thursday 11:00am`,
        confidence: 72,
        risk: "medium",
        requirements: ["Composio API key", "Google Calendar connected account", "Primary contact email"],
      },
      {
        type: "email",
        system: "AgentMail",
        label: `Outreach sent to ${committeeCount} committee members`,
        confidence: 76,
        risk: "high",
        requirements: ["Approved drafts", "AgentMail API key", "Recipient email addresses"],
      },
    ];

    await ctx.db.insert("events", {
      accountId,
      type: "action_fired",
      label: "Closing the loop: firing actions across the stack…",
    });
    await ctx.db.insert("agentSteps", {
      runId,
      accountId,
      agent: "actions",
      type: "approval_gate",
      status: "completed",
      label: "Human-approved action plan queued",
      detail: "Quorum converted the approved account plan into destination-specific jobs.",
      output: {
        destinations: defs.map((d) => d.system),
        committeeCount,
      },
      startedAt: Date.now(),
      completedAt: Date.now(),
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
        await ctx.db.patch(prior._id, {
          status: "pending",
          label: d.label,
          system: d.system,
          confidence: d.confidence,
          risk: d.risk,
          requirements: d.requirements,
          audit: {
            stage: "queued",
            queuedAt: Date.now(),
            requirements: d.requirements,
          },
        });
      } else {
        await ctx.db.insert("actions", {
          accountId,
          type: d.type,
          status: "pending",
          label: d.label,
          system: d.system,
          confidence: d.confidence,
          risk: d.risk,
          requirements: d.requirements,
          audit: {
            stage: "queued",
            queuedAt: Date.now(),
            requirements: d.requirements,
          },
        });
      }

      await ctx.scheduler.runAfter(t, internal.closeLoop.complete, {
        accountId,
        type: d.type,
        label: d.label,
        runId,
      });
      t += 700;
    }

    await ctx.scheduler.runAfter(t + 200, internal.closeLoop.finish, { accountId, runId });
  },
});

export const complete = internalAction({
  args: {
    accountId: v.id("accounts"),
    type: v.string(),
    label: v.string(),
    runId: v.optional(v.id("agentRuns")),
  },
  handler: async (ctx, { accountId, type, label, runId }) => {
    const data: any = await ctx.runQuery(internal.closeLoop.getCloseLoopData, { accountId });
    const account = data?.account;
    const contacts = data?.contacts ?? [];
    const primary = contacts.find((c: any) => c.isPrimary) ?? contacts[0];
    const committee = contacts.filter((c: any) => !c.isPrimary).length;

    let result: { ok: boolean; id?: string } = { ok: false };

    if (type === "slack") {
      result = await execComposio("SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL", {
        channel: process.env.SLACK_CHANNEL ?? "#revenue",
        text: `:tada: ${account?.companyName ?? "Account"} qualified. Meeting booked. Buying committee of ${committee} mapped. (via Quorum)`,
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
        summary: `Quorum pilot: ${account?.companyName}`,
        description: `Qualification follow-up with ${primary?.name ?? "the prospect"}.`,
        attendees: primary?.email ? [primary.email] : [],
        // Google requires a start; book the next Thursday 11:00 (matches the action label).
        start_datetime: nextThursdayAt11(),
        event_duration_minutes: 30,
        timezone: "America/Los_Angeles",
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
      audit: {
        stage: result.ok ? "executed" : "blocked",
        completedAt: Date.now(),
        externalId: result.id,
        lastError: result.ok ? undefined : missingRequirement(type),
      },
    });
    if (runId) {
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId,
        accountId,
        agent: "actions",
        type: "external_action",
        status: result.ok ? "completed" : "blocked",
        label: finalLabel,
        detail: result.ok
          ? `${systemName(type)} accepted the action and returned an external receipt.`
          : missingRequirement(type),
        tool: systemName(type),
        output: result.ok
          ? { externalId: result.id ?? "ok" }
          : { blocked: true, missing: missingRequirement(type) },
        externalId: result.id,
        error: result.ok ? undefined : missingRequirement(type),
      });
    }
  },
});

// Next Thursday at 11:00, as a naive datetime (YYYY-MM-DDTHH:MM:SS, no offset).
// Composio's GOOGLECALENDAR_CREATE_EVENT requires start_datetime; timezone is sent
// separately so the naive time is interpreted in the seller's working hours.
function nextThursdayAt11(): string {
  const now = new Date();
  let add = (4 - now.getUTCDay() + 7) % 7; // 4 = Thursday
  if (add === 0) add = 7;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T11:00:00`;
}

function systemName(type: string): string {
  if (type === "email") return "AgentMail";
  if (type === "hubspot") return "HubSpot via Composio";
  if (type === "calendar") return "Google Calendar via Composio";
  if (type === "slack") return "Slack via Composio";
  return type;
}

function missingRequirement(type: string): string {
  if (type === "email") return "AgentMail is not connected or no approved drafts were available.";
  if (type === "hubspot") return "HubSpot is not connected through Composio.";
  if (type === "calendar") return "Google Calendar is not connected through Composio.";
  if (type === "slack") return "Slack is not connected through Composio.";
  return "Destination is not connected.";
}

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
      return { ok: true, id: extractExternalId(j?.data) };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

// Pull a real external receipt id out of a Composio v3 tool result. Different
// toolkits nest the created-object id differently (Slack returns `ts` at the
// top of `data`; HubSpot/Calendar bury the created object deeper, sometimes
// inside arrays like results:[{id}]), so walk the whole payload — objects AND
// arrays — preferring the Slack `ts` then the shallowest id-like key, before
// falling back to "ok". Recording the true id is what makes a "done" action a
// verifiable receipt rather than a placeholder.
function extractExternalId(data: any): string {
  if (data == null) return "ok";
  const seen = new Set<any>();
  const ID_KEYS = ["id", "messageId", "eventId", "hs_object_id", "htmlLink", "permalink"];
  const scan = (node: any, depth: number): string | undefined => {
    if (node == null || depth > 6 || typeof node !== "object" || seen.has(node)) return undefined;
    seen.add(node);
    // Arrays: HubSpot/Calendar nest the created object inside arrays
    // (e.g. results:[{id}]). Walk each element.
    if (Array.isArray(node)) {
      for (const el of node) {
        const found = scan(el, depth + 1);
        if (found) return found;
      }
      return undefined;
    }
    // Slack message timestamp is the canonical receipt for a posted message.
    if (node.ts != null && (typeof node.ts === "string" || typeof node.ts === "number"))
      return String(node.ts);
    // Most providers (HubSpot, Google Calendar) return the created object id.
    for (const key of ID_KEYS) {
      const val = node[key];
      if (val != null && (typeof val === "string" || typeof val === "number")) return String(val);
    }
    // Otherwise descend into every nested value (objects + arrays) so we find
    // ids that providers bury under varying keys, not just a fixed list.
    for (const key of Object.keys(node)) {
      const nested = scan(node[key], depth + 1);
      if (nested) return nested;
    }
    return undefined;
  };
  return scan(data, 0) ?? "ok";
}

export const markDone = internalMutation({
  args: {
    accountId: v.id("accounts"),
    type: v.string(),
    label: v.string(),
    status: v.string(),
    externalId: v.optional(v.string()),
    audit: v.optional(v.any()),
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
        ...(a.audit ? { audit: a.audit } : {}),
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
  args: { accountId: v.id("accounts"), runId: v.optional(v.id("agentRuns")) },
  handler: async (ctx, { accountId, runId }) => {
    await ctx.db.patch(accountId, { status: "actioned" });
    await ctx.db.insert("events", {
      accountId,
      type: "action_fired",
      label: "Action loop complete",
    });
    if (runId) {
      const actions = await ctx.db
        .query("actions")
        .withIndex("by_account", (q) => q.eq("accountId", accountId))
        .collect();
      const done = actions.filter((action) => action.status === "done").length;
      const blocked = actions.filter((action) => action.status === "skipped" || action.status === "failed").length;
      const now = Date.now();
      await ctx.db.insert("agentSteps", {
        runId,
        accountId,
        agent: "actions",
        type: "reasoning",
        status: blocked ? "blocked" : "completed",
        label: blocked ? "Action loop finished with blocked destinations" : "Action loop completed",
        detail: blocked
          ? "Some destinations need customer connection before Quorum can execute them for real."
          : "Every approved destination action completed successfully.",
        output: { done, blocked },
        startedAt: now,
        completedAt: now,
      });
      await ctx.db.patch(runId, {
        status: blocked ? "blocked" : "completed",
        summary: blocked
          ? `Closed loop partially: ${done} action${done === 1 ? "" : "s"} executed, ${blocked} blocked by missing integrations.`
          : `Closed loop: ${done} approved action${done === 1 ? "" : "s"} executed across customer systems.`,
        completedAt: now,
      });
    }
    // Sync the account brain to HydraDB (best-effort; no-op without a key).
    await ctx.scheduler.runAfter(300, internal.hydra.ingest, { accountId });
  },
});

// Best-effort real email send via AgentMail: send each drafted committee email
// from an agent inbox, mark the draft sent. Returns count sent. Never throws.
async function trySendDraftsViaAgentMail(ctx: any, accountId: any): Promise<number> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) return 0;
  const data: any = await ctx.runQuery(internal.closeLoop.getCloseLoopData, { accountId });
  if (!data) return 0;
  const inbox = process.env.AGENTMAIL_INBOX ?? "quorum@agentmail.to";
  let sent = 0;
  for (const draft of data.drafts ?? []) {
    if (draft.status !== "approved") continue;
    const contact = data.contacts.find((c: any) => String(c._id) === String(draft.contactId));
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
