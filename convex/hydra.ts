import { internalAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

// HydraDB = the temporal account-brain graph (per-account tenant: graph +
// vectorstore). Best-effort and fully isolated: if HydraDB is unavailable (or no
// key), context is assembled directly from Convex so the product never hard-
// depends on it. Convex is always the substrate; HydraDB is an overlay.

const HYDRA_BASE = "https://api.hydradb.com";

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

// HydraDB tenant ids are lowercase alphanumeric + hyphens. Namespace per account
// domain so each account gets an isolated temporal graph.
function tenantFor(domain: string): string {
  const slug = (domain || "default")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `q-${slug || "default"}`.slice(0, 48);
}

async function hydraFetch(path: string, key: string, body: any): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(`${HYDRA_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Provision (idempotently) the account's HydraDB tenant — graph + vectorstore.
// Records an event only when HydraDB confirms the tenant is live.
export const ingest = internalAction({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }) => {
    // Unguarded internal load: ingest runs from the scheduler with no auth
    // context, so the access-scoped public query would return null. (See
    // committee.mapCommittee for the same autonomous-load pattern.)
    const data: any = await ctx.runQuery(internal.brain.getBrainData, { accountId });
    if (!data) return;

    const key = process.env.HYDRADB_API_KEY;
    if (!key) return; // Convex remains the substrate; nothing to do.

    const tenant = tenantFor(data.account.domain);
    const res = await hydraFetch("/tenants", key, { tenant_id: tenant });
    if (!res) return;
    // 2xx = created/accepted; 409 = already provisioned. Either way it's live.
    if (res.ok || res.status === 409) {
      await ctx.runMutation(internal.mutations.recordEvent, {
        accountId,
        type: "rethread",
        label: "Account brain linked to HydraDB temporal graph",
      });
    }
  },
});

// Retrieve account context for building a (re)thread system prompt. Tries
// HydraDB's graph query, falls back to Convex-assembled context.
export const query = action({
  args: { accountId: v.id("accounts"), q: v.optional(v.string()) },
  handler: async (ctx, { accountId, q }): Promise<string> => {
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    if (!data) return "";
    const fallback = assembleContext(data);

    const key = process.env.HYDRADB_API_KEY;
    if (!key) return fallback;

    const tenant = tenantFor(data.account.domain);
    const res = await hydraFetch("/query", key, {
      tenant_id: tenant,
      query: q ?? "summarize everything we know about this account",
      top_k: 8,
    });
    if (!res || !res.ok) return fallback;
    try {
      const j: any = await res.json();
      const chunks = j?.data?.chunks ?? j?.chunks ?? [];
      const text = chunks
        .map((c: any) => c.text ?? c.content ?? "")
        .filter(Boolean)
        .join("\n");
      return text || fallback;
    } catch {
      return fallback;
    }
  },
});
