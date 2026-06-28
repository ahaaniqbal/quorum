import { internalAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// HydraDB = the temporal account-brain graph. Best-effort and fully isolated:
// if HydraDB is unavailable (or no key), context is assembled directly from
// Convex so the demo never hard-depends on it.

function assembleContext(data: any): string {
  const a = data.account;
  const e = a.enrichment ?? {};
  const lines: string[] = [
    `ACCOUNT: ${a.companyName} (${a.domain}): ${e.industry ?? ""}, ${e.funding ?? ""}`,
    `SIGNALS: ${(e.signals ?? []).join("; ")}`,
    `COMMITTEE: ${data.contacts
      .map((c: any) => `${c.name} (${c.title ?? c.role})`)
      .join(", ")}`,
  ];
  if (data.latestConversation?.summary)
    lines.push(`LAST CALL: ${data.latestConversation.summary}`);
  return lines.join("\n");
}

// Sync the account (enrichment, committee, transcript, interactions) to HydraDB.
// Records an event only when a real sync succeeds.
export const ingest = internalAction({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    if (!data) return;
    const context = assembleContext(data);

    const key = process.env.HYDRADB_API_KEY;
    if (!key) return; // Convex remains the substrate; nothing to do.

    try {
      const res = await fetch("https://api.hydradb.com/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          namespace: `account:${data.account.domain}`,
          documents: [
            { id: String(accountId), text: context, metadata: { type: "account" } },
            ...data.transcript.map((l: any) => ({
              id: String(l._id),
              text: `${l.role}: ${l.text}`,
              metadata: { type: "transcript", role: l.role },
            })),
          ],
        }),
      });
      if (res.ok) {
        await ctx.runMutation(internal.mutations.recordEvent, {
          accountId,
          type: "rethread",
          label: "Account brain synced to HydraDB (temporal graph)",
        });
      }
    } catch {
      // best-effort: Convex context stands in
    }
  },
});

// Retrieve account context for building a (re)thread system prompt. Tries
// HydraDB, falls back to Convex-assembled context.
export const query = action({
  args: { accountId: v.id("accounts"), q: v.optional(v.string()) },
  handler: async (ctx, { accountId, q }): Promise<string> => {
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    if (!data) return "";
    const fallback = assembleContext(data);

    const key = process.env.HYDRADB_API_KEY;
    if (!key) return fallback;

    try {
      const res = await fetch("https://api.hydradb.com/v1/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          namespace: `account:${data.account.domain}`,
          query: q ?? "summarize everything we know about this account",
          topK: 8,
        }),
      });
      if (!res.ok) return fallback;
      const j: any = await res.json();
      const text = j?.results?.map((r: any) => r.text).join("\n") ?? "";
      return text || fallback;
    } catch {
      return fallback;
    }
  },
});
