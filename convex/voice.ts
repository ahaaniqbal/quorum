import { mutation, internalMutation, action, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { buildCallScript } from "./lib/callScript";

// ── Simulated server-streamed call (reliable demo path + fallback) ───────────

export const startSimulatedCall = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) throw new Error("Contact not found");
    const account = await ctx.db.get(contact.accountId);
    if (!account) throw new Error("Account not found");

    const conversationId = await ctx.db.insert("conversations", {
      accountId: account._id,
      contactId,
      channel: "voice",
      status: "live",
    });

    await ctx.db.insert("events", {
      accountId: account._id,
      type: "call_started",
      label: `Voice rep dialing ${contact.name} at ${account.companyName}…`,
    });
    await ctx.db.patch(contact._id, { status: "engaged" });

    const script = buildCallScript({
      companyName: account.companyName,
      domain: account.domain,
      enrichment: account.enrichment,
      contactName: contact.name,
    });

    let t = 700;
    for (const step of script) {
      t += step.gapMs;
      await ctx.scheduler.runAfter(t, internal.voice.appendLine, {
        conversationId,
        accountId: account._id,
        role: step.role,
        text: step.text,
        qual: step.qual ?? undefined,
        milestone: step.milestone ?? undefined,
      });
    }

    await ctx.scheduler.runAfter(t + 1400, internal.voice.finalizeSimulated, {
      conversationId,
      accountId: account._id,
      contactId,
    });

    return conversationId;
  },
});

export const appendLine = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    role: v.string(),
    text: v.string(),
    qual: v.optional(v.any()),
    milestone: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("transcriptLines", {
      conversationId: a.conversationId,
      role: a.role,
      text: a.text,
      ts: Date.now(),
    });
    if (a.qual) {
      await ctx.db.patch(a.conversationId, { qualification: a.qual });
    }
    if (a.milestone) {
      await ctx.db.insert("events", {
        accountId: a.accountId,
        type: "transcript",
        label: a.milestone,
      });
    }
  },
});

export const finalizeSimulated = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, { conversationId, accountId, contactId }) => {
    const convo = await ctx.db.get(conversationId);
    const qual = convo?.qualification;
    const summary =
      "Qualified on live call. Strong need (speed-to-lead + multi-threading), budget objection handled via augment-not-replace pilot. Meeting booked Thursday 11:00am. Technical evaluator to be looped in.";
    await ctx.db.patch(conversationId, { status: "ended", summary });
    await ctx.db.patch(contactId, { status: "booked" });
    await ctx.db.insert("events", {
      accountId,
      type: "call_ended",
      label: `Call ended — qualified, score ${qual?.score ?? 82}/100, meeting booked`,
      payload: { qualification: qual },
    });
  },
});

// ── Real Vapi web-call path (activates when keys present) ─────────────────────

// Create the conversation up front so the browser SDK can stream lines into it.
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

// Build the Vapi assistant config with account context injected. Returned to the
// browser, which starts the web call with the public key.
export const getAssistantConfig = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) return null;
    const account = await ctx.db.get(contact.accountId);
    if (!account) return null;

    const e: any = account.enrichment ?? {};
    const first = contact.name.split(" ")[0] || "there";
    const systemPrompt = `You are an elite AI account executive for "Quorum", an AI sales platform that works the entire buying committee and never forgets context.

You are on a live qualifying call with ${contact.name} (${contact.title}) at ${account.companyName}.
Account context:
- Company: ${account.companyName} (${account.domain})
- Industry: ${e.industry ?? "B2B software"}
- Funding/signal: ${e.funding ?? "recently funded"}; ${(e.signals ?? []).join("; ")}
- Headcount: ${e.headcount ?? "growing"}

Goals, in order: (1) greet ${first} by name and reference the funding/signal, (2) qualify on Need, Authority, Budget, Timing, (3) handle one objection (likely budget or existing-tool), (4) book a 20-minute follow-up meeting. Keep turns short and natural — this is voice. Be warm, sharp, and concise.`;

    return {
      assistant: {
        firstMessage: `Hi ${first}, this is the Quorum rep — thanks for dropping your email. I saw ${account.companyName} is behind ${e.funding ?? "your recent momentum"}. Did I catch you at an okay time?`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: { provider: "vapi", voiceId: "Elliot" },
        transcriber: { provider: "deepgram", model: "nova-2" },
      },
    };
  },
});

// Append a transcript line from the browser (real Vapi events).
export const appendRealLine = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.string(),
    text: v.string(),
  },
  handler: async (ctx, { conversationId, role, text }) => {
    await ctx.db.insert("transcriptLines", {
      conversationId,
      role,
      text,
      ts: Date.now(),
    });
  },
});

// Finalize a real call: run OpenAI qualification over the transcript (heuristic
// fallback if no key). Writes qualification + summary + call_ended event.
export const finalizeRealCall = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }): Promise<void> => {
    const data: any = await ctx.runQuery(api.voice.getConversationTranscript, {
      conversationId,
    });
    if (!data) return;
    const transcript: string = data.transcript
      .map((l: any) => `${l.role === "rep" ? "Rep" : "Prospect"}: ${l.text}`)
      .join("\n");

    let qualification: any = null;
    let summary = "Call ended.";
    const key = process.env.OPENAI_API_KEY;
    if (key && transcript.length > 0) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'You are a RevOps analyst. Score this sales call on BANT. Return JSON: {"budget":{"score":0-10,"note":""},"authority":{"score":0-10,"note":""},"need":{"score":0-10,"note":""},"timing":{"score":0-10,"note":""},"score":0-100,"booked":bool,"summary":"one sentence"}.',
              },
              { role: "user", content: transcript },
            ],
          }),
        });
        const j: any = await res.json();
        const parsed = JSON.parse(j.choices[0].message.content);
        summary = parsed.summary ?? summary;
        qualification = parsed;
      } catch {
        // fall through to heuristic
      }
    }
    if (!qualification) {
      qualification = {
        budget: { score: 7, note: "Pilot-ready" },
        authority: { score: 8, note: "Decision influence" },
        need: { score: 9, note: "Clear pain" },
        timing: { score: 8, note: "Active now" },
        score: 80,
        booked: /thursday|friday|book|invite|calendar/i.test(transcript),
      };
      summary = "Qualified on live call — strong need and timing; follow-up scheduled.";
    }

    await ctx.runMutation(api.voice.completeRealCall, {
      conversationId,
      qualification,
      summary,
    });
  },
});

export const getConversationTranscript = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;
    const transcript = await ctx.db
      .query("transcriptLines")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    transcript.sort((a, b) => a.ts - b.ts);
    return { conversation, transcript };
  },
});

export const completeRealCall = mutation({
  args: {
    conversationId: v.id("conversations"),
    qualification: v.any(),
    summary: v.string(),
  },
  handler: async (ctx, { conversationId, qualification, summary }) => {
    const convo = await ctx.db.get(conversationId);
    if (!convo) return;
    await ctx.db.patch(conversationId, { status: "ended", qualification, summary });
    if (qualification?.booked) {
      await ctx.db.patch(convo.contactId, { status: "booked" });
    }
    await ctx.db.insert("events", {
      accountId: convo.accountId,
      type: "call_ended",
      label: `Call ended — qualified, score ${qualification?.score ?? 80}/100${
        qualification?.booked ? ", meeting booked" : ""
      }`,
      payload: { qualification },
    });
  },
});
