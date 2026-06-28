import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { openaiChat, repSystemPrompt, type ChatMessage } from "./lib/openai";

// ── Context loaders ──────────────────────────────────────────────────────────

export const getContactContext = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) return null;
    const account = await ctx.db.get(contact.accountId);
    return { contact, account };
  },
});

export const getConvoContext = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const contact = await ctx.db.get(conversation.contactId);
    const account = await ctx.db.get(conversation.accountId);
    const transcript = await ctx.db
      .query("transcriptLines")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    transcript.sort((a, b) => a.ts - b.ts);
    return { conversation, contact, account, transcript };
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
      label: `Call ended — qualified, score ${qualification?.score ?? "—"}/100${
        qualification?.booked ? ", meeting booked" : ""
      }`,
      payload: { qualification },
    });
  },
});

// ── Real OpenAI-driven qualification conversation ────────────────────────────

export const startCall = action({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }): Promise<string> => {
    const cc: any = await ctx.runQuery(api.voice.getContactContext, { contactId });
    if (!cc?.contact || !cc?.account) throw new Error("Contact not found");
    const { contact, account } = cc;

    const conversationId: string = await ctx.runMutation(api.voice.createConvo, {
      accountId: account._id,
      contactId,
      label: `AI rep opened a call with ${contact.name} at ${account.companyName}`,
    });

    const prior: string | null = await ctx.runQuery(api.voice.priorContext, {
      accountId: account._id,
      exceptConvo: conversationId as any,
    });
    const system = repSystemPrompt(account, contact, prior ?? undefined);
    const first = contact.name.split(" ")[0];
    const opening =
      (await openaiChat(
        [
          { role: "system", content: system },
          { role: "user", content: "Begin the call now. Give only your opening line." },
        ],
        { maxTokens: 120 }
      )) ??
      `Hi ${first}, this is the Quorum rep — thanks for dropping your email. Did I catch you at an okay time?`;

    await ctx.runMutation(api.voice.appendLine, {
      conversationId: conversationId as any,
      accountId: account._id,
      role: "rep",
      text: opening,
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
    const system = repSystemPrompt(account, contact, prior ?? undefined);
    const history: ChatMessage[] = c.transcript.map((l: any) => ({
      role: l.role === "rep" ? "assistant" : "user",
      content: l.text,
    }));
    history.push({ role: "user", content: text });

    const reply =
      (await openaiChat([{ role: "system", content: system }, ...history], {
        maxTokens: 180,
      })) ?? "Got it — tell me a bit more about that.";

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
  },
});

// ── Real Vapi web-call path (activates when a public key is set) ──────────────

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
    const e: any = account.enrichment ?? {};
    const first = contact.name.split(" ")[0] || "there";
    return {
      assistant: {
        firstMessage: `Hi ${first}, this is the Quorum rep — thanks for dropping your email. I saw ${account.companyName} is behind ${e.funding ?? "your recent momentum"}. Did I catch you at an okay time?`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: repSystemPrompt(account, contact) }],
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
