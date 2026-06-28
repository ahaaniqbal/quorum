import { action, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { openaiChat } from "./lib/openai";
import {
  memorySynthesisPrompt,
  committeeInferencePrompt,
  nextMovePrompt,
} from "./lib/prompts";

const REASON_MODEL = "gpt-4o"; // strong reasoning: committee + next-move
const FAST_MODEL = "gpt-4o-mini"; // extraction: memory

// Strict-JSON call with one retry + fence stripping. Returns null on failure so
// the caller can fall back to the last good state rather than crash.
async function openaiJSON(system: string, user: string, model: string): Promise<any | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await openaiChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { model, temperature: 0.25, json: true, maxTokens: 1800 }
    );
    if (!raw) continue;
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      /* retry */
    }
  }
  return null;
}

// Unguarded context loader for the engines (internal only).
export const getBrainData = internalQuery({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const account = await ctx.db.get(accountId);
    if (!account) return null;
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const seller = account.userId
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", account.userId!))
          .first()
      : null;
    const convos = await ctx.db
      .query("conversations")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const latestConversation =
      convos
        .filter((c) => c.status === "ended" && c.summary)
        .sort((a, b) => b._creationTime - a._creationTime)[0] ?? null;
    return { account, contacts, seller, latestConversation };
  },
});

export const saveMemory = internalMutation({
  args: { accountId: v.id("accounts"), memory: v.any(), whatChanged: v.string() },
  handler: async (ctx, { accountId, memory, whatChanged }) => {
    await ctx.db.patch(accountId, { memory });
    await ctx.db.insert("events", {
      accountId,
      type: "enriched",
      label: `Brain updated: ${whatChanged}`,
    });
  },
});

export const saveGraph = internalMutation({
  args: { accountId: v.id("accounts"), graph: v.any() },
  handler: async (ctx, { accountId, graph }) => {
    await ctx.db.patch(accountId, { graph });
    const n = graph?.stakeholders?.length ?? 0;
    const g = graph?.gaps?.length ?? 0;
    await ctx.db.insert("events", {
      accountId,
      type: "committee_mapped",
      label: `Committee graph built: ${n} stakeholder${n === 1 ? "" : "s"}, ${g} gap${g === 1 ? "" : "s"} flagged`,
    });
  },
});

export const saveMoves = internalMutation({
  args: { accountId: v.id("accounts"), moves: v.any() },
  handler: async (ctx, { accountId, moves }) => {
    await ctx.db.patch(accountId, { moves });
    const top = moves?.top_move?.action;
    await ctx.db.insert("events", {
      accountId,
      type: "outreach_drafted",
      label: top ? `Next move: ${top}` : "Next moves computed",
    });
  },
});

// 1. Memory Synthesis
export const synthesizeMemory = action({
  args: { accountId: v.id("accounts"), conversationId: v.id("conversations") },
  handler: async (ctx, { accountId, conversationId }): Promise<any> => {
    const c: any = await ctx.runQuery(api.voice.getConvoContext, { conversationId });
    if (!c?.account) return null;
    const transcript: string = (c.transcript ?? [])
      .map((l: any) => `${l.role === "rep" ? "Rep" : "Prospect"}: ${l.text}`)
      .join("\n");
    if (!transcript) return null;

    const system = memorySynthesisPrompt(c.seller);
    const user = `CURRENT_MEMORY:\n${JSON.stringify(c.account.memory ?? {})}\n\nCONVERSATION:\n${transcript}`;
    const out = await openaiJSON(system, user, FAST_MODEL);
    if (!out) return c.account.memory ?? null; // fall back to last good
    await ctx.runMutation(internal.brain.saveMemory, {
      accountId,
      memory: out,
      whatChanged: out.what_changed ?? "captured the latest conversation",
    });
    return out;
  },
});

// 2. Committee Inference (graph builder)
export const inferCommittee = action({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<any> => {
    const d: any = await ctx.runQuery(internal.brain.getBrainData, { accountId });
    if (!d?.account) return null;
    const knownPeople = d.contacts.map((c: any) => ({
      name: c.name,
      title: c.title,
      email: c.email,
      isPrimary: c.isPrimary,
      status: c.status,
    }));
    const system = committeeInferencePrompt(d.seller);
    const user = `COMPANY:\n${JSON.stringify(d.account.enrichment ?? {})}\n\nKNOWN_PEOPLE:\n${JSON.stringify(knownPeople)}\n\nCURRENT_GRAPH:\n${JSON.stringify(d.account.graph ?? {})}\n\nMENTIONED:\n${JSON.stringify(d.account.memory?.new_stakeholders_mentioned ?? [])}`;
    const out = await openaiJSON(system, user, REASON_MODEL);
    if (!out?.stakeholders) return d.account.graph ?? null;
    await ctx.runMutation(internal.brain.saveGraph, { accountId, graph: out });
    return out;
  },
});

// ── 3. Next-Move Engine ──
export const computeNextMoves = action({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<any> => {
    const d: any = await ctx.runQuery(internal.brain.getBrainData, { accountId });
    if (!d?.account) return null;
    const system = nextMovePrompt(d.seller);
    const user = `GRAPH:\n${JSON.stringify(d.account.graph ?? {})}\n\nMEMORY:\n${JSON.stringify(d.account.memory ?? {})}`;
    const out = await openaiJSON(system, user, REASON_MODEL);
    if (!out?.top_move && !out?.moves) return d.account.moves ?? null;
    await ctx.runMutation(internal.brain.saveMoves, { accountId, moves: out });
    return out;
  },
});

// ── The chain: memory → committee → next-move. Run on every conversation. ──
export const runBrainChain = action({
  args: {
    accountId: v.id("accounts"),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, { accountId, conversationId }): Promise<void> => {
    if (conversationId) {
      await ctx.runAction(api.brain.synthesizeMemory, { accountId, conversationId });
    }
    await ctx.runAction(api.brain.inferCommittee, { accountId });
    await ctx.runAction(api.brain.computeNextMoves, { accountId });
  },
});
