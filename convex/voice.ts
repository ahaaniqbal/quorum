import { action, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { openaiChat, type ChatMessage } from "./lib/openai";
import { voiceRepPrompt } from "./lib/prompts";

// Build the rep's system prompt: personalized to the seller, primed to discover
// the buying committee while it talks.
function buildRepSystem(account: any, contact: any, seller: any, prior?: string | null) {
  const e: any = account?.enrichment ?? {};
  const context = [
    e.industry,
    e.headcount ? `${e.headcount} employees` : null,
    e.funding,
    Array.isArray(e.signals) && e.signals.length ? `Signals: ${e.signals.join("; ")}` : null,
    prior ? `Prior context on this account: ${prior}` : null,
  ]
    .filter(Boolean)
    .join(". ");
  return voiceRepPrompt({
    sellerCompany: seller?.companyName ?? "Quorum",
    prospectName: contact.name,
    prospectTitle: contact.title ?? "",
    prospectCompany: account.companyName,
    prospectContext: context || "A B2B company.",
  });
}

// ── Context loaders ──────────────────────────────────────────────────────────

async function sellerFor(ctx: any, account: any) {
  if (!account?.userId) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", account.userId))
    .first();
}

export const getContactContext = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) return null;
    const account = await ctx.db.get(contact.accountId);
    const seller = await sellerFor(ctx, account);
    return { contact, account, seller };
  },
});

export const getConvoContext = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const contact = await ctx.db.get(conversation.contactId);
    const account = await ctx.db.get(conversation.accountId);
    const seller = await sellerFor(ctx, account);
    const transcript = await ctx.db
      .query("transcriptLines")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    transcript.sort((a, b) => a.ts - b.ts);
    return { conversation, contact, account, seller, transcript };
  },
});

// Memory across the account: prior call summary + the mapped committee. This is
// what makes a re-threaded conversation reference real prior context.
export const priorContext = query({
  args: { accountId: v.id("accounts"), exceptConvo: v.optional(v.id("conversations")) },
  handler: async (ctx, { accountId, exceptConvo }) => {
    const convos = await ctx.db
      .query("conversations")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const prior = convos
      .filter((c) => c._id !== exceptConvo && c.status === "ended" && c.summary)
      .sort((a, b) => b._creationTime - a._creationTime)[0];
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const committee = contacts
      .filter((c) => !c.isPrimary)
      .map((c) => `${c.name} (${c.title ?? c.role})`)
      .join(", ");
    const parts: string[] = [];
    if (prior?.summary) {
      const who = contacts.find((c) => c._id === prior.contactId)?.name ?? "a colleague";
      parts.push(`Earlier conversation with ${who}: ${prior.summary}`);
    }
    if (committee) parts.push(`Buying committee already mapped: ${committee}`);
    return parts.length ? parts.join("\n") : null;
  },
});

// ── Mutations the actions write through ──────────────────────────────────────

export const createConvo = mutation({
  args: { accountId: v.id("accounts"), contactId: v.id("contacts"), label: v.string() },
  handler: async (ctx, { accountId, contactId, label }) => {
    const conversationId = await ctx.db.insert("conversations", {
      accountId,
      contactId,
      channel: "voice",
      status: "live",
    });
    await ctx.db.insert("events", { accountId, type: "call_started", label });
    await ctx.db.patch(contactId, { status: "engaged" });
    return conversationId;
  },
});

export const appendLine = mutation({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    role: v.string(),
    text: v.string(),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("transcriptLines", {
      conversationId: a.conversationId,
      role: a.role,
      text: a.text,
      ts: Date.now(),
    });
  },
});

export const finishCall = mutation({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    qualification: v.any(),
    summary: v.string(),
  },
  handler: async (ctx, { conversationId, accountId, contactId, qualification, summary }) => {
    await ctx.db.patch(conversationId, { status: "ended", qualification, summary });
    await ctx.db.patch(contactId, { status: qualification?.booked ? "booked" : "engaged" });
    await ctx.db.insert("events", {
      accountId,
      type: "call_ended",
      label: `Call ended: qualified, score ${qualification?.score ?? "n/a"}/100${
        qualification?.booked ? ", meeting booked" : ""
      }`,
      payload: { qualification },
    });
  },
});

// Real OpenAI-driven qualification conversation

export const startCall = action({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }): Promise<string> => {
    const cc: any = await ctx.runQuery(api.voice.getContactContext, { contactId });
    if (!cc?.contact || !cc?.account) throw new Error("Contact not found");
    const { contact, account } = cc;
    const access: any = await ctx.runQuery(internal.authz.assertAccountAccess, { accountId: account._id });
    const runId: string = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId: account._id,
      userId: access.userId ?? undefined,
      trigger: "manual",
      goal: `Open an AI qualification call with ${contact.name} at ${account.companyName}`,
    });

    const conversationId: string = await ctx.runMutation(api.voice.createConvo, {
      accountId: account._id,
      contactId,
      label: `AI rep opened a call with ${contact.name} at ${account.companyName}`,
    });

    const prior: string | null = await ctx.runQuery(api.voice.priorContext, {
      accountId: account._id,
      exceptConvo: conversationId as any,
    });
    const system = buildRepSystem(account, contact, cc.seller, prior);
    const first = contact.name.split(" ")[0];
    const opening =
      (await openaiChat(
        [
          { role: "system", content: system },
          { role: "user", content: "Begin the call now. Give only your opening line." },
        ],
        { maxTokens: 120 }
      )) ??
      `Hi ${first}, this is the Quorum rep. Thanks for dropping your email. Did I catch you at an okay time?`;

    await ctx.runMutation(api.voice.appendLine, {
      conversationId: conversationId as any,
      accountId: account._id,
      role: "rep",
      text: opening,
    });
    await ctx.runMutation(internal.agentTrace.recordStep, {
      runId: runId as any,
      accountId: account._id,
      agent: "brain",
      type: "tool_call",
      status: "completed",
      label: "AI rep opened qualification call",
      detail: "Quorum generated a context-aware opening using account enrichment, seller profile, and prior committee memory.",
      tool: process.env.OPENAI_API_KEY ? "OpenAI voice rep" : "fallback voice script",
      output: { conversationId, contact: contact.name, priorContext: Boolean(prior) },
    });
    await ctx.runMutation(internal.agentTrace.completeRun, {
      runId: runId as any,
      status: "completed",
      summary: `Opened AI qualification call with ${contact.name} and wrote the first rep turn.`,
    });
    return conversationId;
  },
});

export const replyToCall = action({
  args: { conversationId: v.id("conversations"), text: v.string() },
  handler: async (ctx, { conversationId, text }): Promise<string | null> => {
    const c: any = await ctx.runQuery(api.voice.getConvoContext, { conversationId });
    if (!c?.conversation || c.conversation.status !== "live") return null;
    const { account, contact } = c;

    await ctx.runMutation(api.voice.appendLine, {
      conversationId,
      accountId: account._id,
      role: "prospect",
      text,
    });

    const prior: string | null = await ctx.runQuery(api.voice.priorContext, {
      accountId: account._id,
      exceptConvo: conversationId,
    });
    const system = buildRepSystem(account, contact, c.seller, prior);
    const history: ChatMessage[] = c.transcript.map((l: any) => ({
      role: l.role === "rep" ? "assistant" : "user",
      content: l.text,
    }));
    history.push({ role: "user", content: text });

    const reply =
      (await openaiChat([{ role: "system", content: system }, ...history], {
        maxTokens: 180,
      })) ?? "Got it. Tell me a bit more about that.";

    await ctx.runMutation(api.voice.appendLine, {
      conversationId,
      accountId: account._id,
      role: "rep",
      text: reply,
    });
    return reply;
  },
});

export const endCall = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }): Promise<void> => {
    const c: any = await ctx.runQuery(api.voice.getConvoContext, { conversationId });
    if (!c?.conversation || c.conversation.status !== "live") return;
    const { account } = c;
    const transcript: string = c.transcript
      .map((l: any) => `${l.role === "rep" ? "Rep" : "Prospect"}: ${l.text}`)
      .join("\n");

    let qualification: any = null;
    let summary = "Call ended.";
    const analysis = await openaiChat(
      [
        {
          role: "system",
          content:
            'You are a RevOps analyst scoring a sales qualification call on BANT. Return ONLY strict JSON: {"budget":{"score":0,"note":""},"authority":{"score":0,"note":""},"need":{"score":0,"note":""},"timing":{"score":0,"note":""},"score":0,"booked":false,"summary":""}. Pillar scores 0-10, overall score 0-100, booked=true only if a meeting/next step was agreed, summary one sentence.',
        },
        { role: "user", content: transcript || "No conversation took place." },
      ],
      { json: true, maxTokens: 400 }
    );
    if (analysis) {
      try {
        qualification = JSON.parse(analysis);
        summary = qualification.summary ?? summary;
      } catch {
        /* fall through */
      }
    }
    if (!qualification) {
      const booked = /book|meeting|call|thursday|friday|calendar|invite|schedul/i.test(transcript);
      qualification = {
        budget: { score: 5, note: "" },
        authority: { score: 5, note: "" },
        need: { score: 6, note: "" },
        timing: { score: 5, note: "" },
        score: 55,
        booked,
        summary: "Conversation completed.",
      };
      summary = qualification.summary;
    }

    await ctx.runMutation(api.voice.finishCall, {
      conversationId,
      accountId: account._id,
      contactId: c.conversation.contactId,
      qualification,
      summary,
    });
    const runId: string = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId: account._id,
      userId: account.userId,
      trigger: "manual",
      goal: `Analyze qualification call and update ${account.companyName}'s account brain`,
    });
    await ctx.runMutation(internal.agentTrace.recordStep, {
      runId: runId as any,
      accountId: account._id,
      agent: "brain",
      type: "reasoning",
      status: "completed",
      label: "Qualification call analyzed",
      detail: summary,
      tool: process.env.OPENAI_API_KEY ? "OpenAI call analyst" : "heuristic call analyst",
      output: {
        score: qualification?.score,
        booked: Boolean(qualification?.booked),
        conversationId,
      },
    });
    await ctx.runMutation(internal.agentTrace.completeRun, {
      runId: runId as any,
      status: "completed",
      summary: `Analyzed call, scored ${qualification?.score ?? "n/a"}/100, and queued account brain synthesis.`,
    });

    // Thicken the deal brain from this conversation: memory → committee → moves.
    await ctx.scheduler.runAfter(150, api.brain.runBrainChain, {
      accountId: account._id,
      conversationId,
    });
  },
});

// Real Vapi web-call path (activates when a public key is set)

export const createVoiceConversation = mutation({
  args: { contactId: v.id("contacts"), vapiCallId: v.optional(v.string()) },
  handler: async (ctx, { contactId, vapiCallId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) throw new Error("Contact not found");
    const account = await ctx.db.get(contact.accountId);
    if (!account) throw new Error("Account not found");
    const conversationId = await ctx.db.insert("conversations", {
      accountId: account._id,
      contactId,
      channel: "voice",
      status: "live",
      vapiCallId,
    });
    await ctx.db.insert("events", {
      accountId: account._id,
      type: "call_started",
      label: `Live voice call connected with ${contact.name} at ${account.companyName}`,
    });
    await ctx.db.patch(contact._id, { status: "engaged" });
    return conversationId;
  },
});

export const getAssistantConfig = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) return null;
    const account = await ctx.db.get(contact.accountId);
    if (!account) return null;
    const seller = await sellerFor(ctx, account);
    const e: any = account.enrichment ?? {};
    const first = contact.name.split(" ")[0] || "there";
    return {
      assistant: {
        firstMessage: `Hi ${first}, thanks for dropping your email. I saw ${account.companyName} is behind ${e.funding ?? "your recent momentum"}. Did I catch you at an okay time?`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: buildRepSystem(account, contact, seller) }],
        },
        voice: { provider: "vapi", voiceId: "Elliot" },
        transcriber: { provider: "deepgram", model: "nova-2" },
      },
    };
  },
});

export const appendRealLine = mutation({
  args: { conversationId: v.id("conversations"), role: v.string(), text: v.string() },
  handler: async (ctx, { conversationId, role, text }) => {
    await ctx.db.insert("transcriptLines", { conversationId, role, text, ts: Date.now() });
  },
});

export const finalizeRealCall = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }): Promise<void> => {
    // Same analysis path as endCall.
    await ctx.runAction(api.voice.endCall, { conversationId });
  },
});
