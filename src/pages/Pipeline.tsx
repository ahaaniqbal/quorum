import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { STAGES, STAGE_INDEX } from "../lib/stages";
import { timeAgo } from "../lib/format";
import { copy } from "../copy";

const FREE_DOMAINS = new Set([
  "gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com",
  "proton.me", "protonmail.com", "aol.com", "live.com", "msn.com", "me.com",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A realistic "morning inbound" burst — varied real B2B companies Quorum works
// in parallel, so the rep never types one at a time.
const BURST = [
  "ceo@rippling.com", "gtm@brex.com", "sales@airtable.com", "ops@retool.com",
  "revenue@deel.com", "founder@mercury.com", "head@vanta.com", "lead@census.com",
];

function parseEmails(text: string): { valid: string[]; skipped: number } {
  const all = text.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  let skipped = 0;
  for (const e of all) {
    if (!EMAIL_RE.test(e)) continue;
    if (FREE_DOMAINS.has(e.split("@")[1])) { skipped++; continue; }
    if (!seen.has(e)) { seen.add(e); valid.push(e); }
  }
  return { valid, skipped };
}

export default function Pipeline() {
  const navigate = useNavigate();
  const enrich = useAction(api.actions.enrichFromEmail);
  const bulkIngest = useMutation(api.inbound.bulkIngest);
  const ensureToken = useAction(api.inbound.ensureIngestToken);
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const sampleId = useQuery(api.queries.getSampleAccountId, {});
  const ingest = useQuery(api.inbound.getIngestInfo, {});
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const webhookUrl = ingest?.url ?? null;

  function openSample() {
    if (sampleId) navigate(`/deal/${sampleId}`);
  }

  // Tokenize pasted/typed/CSV text into deduped email pills. Skips invalid and
  // personal-domain addresses and notes how many were dropped.
  function addTokens(raw: string) {
    const { valid, skipped } = parseEmails(raw);
    if (!valid.length && !skipped) return;
    setEmails((prev) => {
      const seen = new Set(prev);
      return [...prev, ...valid.filter((e) => !seen.has(e) && (seen.add(e), true))];
    });
    setNote(
      skipped ? `Skipped ${skipped} personal/invalid address${skipped === 1 ? "" : "es"}.` : null
    );
    setError(null);
  }

  function removePill(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["Enter", ",", " ", "Tab"].includes(e.key) && draft.trim()) {
      e.preventDefault();
      addTokens(draft);
      setDraft("");
    } else if (e.key === "Backspace" && !draft && emails.length) {
      removePill(emails[emails.length - 1]);
    }
  }

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    try {
      const txt = await file.text();
      addTokens(txt); // addTokens regex-matches emails anywhere, so CSV cells work
    } catch {
      setError(copy.edge.genericError);
    }
  }

  async function onRun(e: React.FormEvent) {
    e.preventDefault();
    // Fold any half-typed address in before working.
    const pending = parseEmails(draft).valid;
    const all = Array.from(new Set([...emails, ...pending]));
    if (all.length === 0) return setError(copy.edge.invalidEmail);
    setError(null);
    setDraft("");
    // One email → open the deal. Many → fan out and let them stream in.
    if (all.length === 1) {
      setLoading(true);
      try {
        const accountId = await enrich({ email: all[0] });
        navigate(`/deal/${accountId}`);
      } catch {
        setError(copy.edge.genericError);
        setLoading(false);
      }
      return;
    }
    await runBatch(all);
  }

  async function runBatch(list: string[]) {
    setLoading(true);
    try {
      const { queued } = await bulkIngest({ emails: list });
      setWorking(queued);
      setEmails([]);
      setNote(null);
      setTimeout(() => setWorking(null), 60000);
    } catch {
      setError(copy.edge.genericError);
    } finally {
      setLoading(false);
    }
  }

  async function generateHook() {
    setMinting(true);
    try {
      // Mints + stores the token; the reactive getIngestInfo query fills in the URL.
      await ensureToken();
    } catch {
      /* no-op */
    } finally {
      setMinting(false);
    }
  }

  async function copyHook() {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      {/* Page header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="mono-label mb-1">Pipeline</div>
          <h1 className="text-[18px] font-semibold tracking-tight">Accounts</h1>
        </div>
        <span className="mono-label tnum text-tertiary">
          {String(pipeline.length).padStart(2, "0")} active
        </span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-7">
        {/* Inbound entry */}
        <div className="cell p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-3 flex items-center gap-2">
            <span className="mono-label">Inbound</span>
            <span className="text-[13px] text-secondary">
              — Quorum works every lead automatically. Paste a batch, connect a source, or take one
              by hand.
            </span>
          </div>
          <form onSubmit={onRun} noValidate>
            {/* Email-pill input: paste/type many, remove any with × */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="flex min-h-[60px] cursor-text flex-wrap content-start items-center gap-1.5 rounded border border-border bg-surface p-2 transition-colors duration-150 focus-within:border-border-strong"
            >
              {emails.map((e) => (
                <span
                  key={e}
                  className="inline-flex items-center gap-1.5 rounded border border-border bg-surface2 py-1 pl-2.5 pr-1.5 font-mono text-[12px] text-text"
                >
                  {e}
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      removePill(e);
                    }}
                    className="flex h-4 w-4 items-center justify-center rounded-sm text-tertiary transition-colors hover:bg-border hover:text-text"
                    aria-label={`Remove ${e}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={(e) => {
                  e.preventDefault();
                  addTokens(e.clipboardData.getData("text"));
                  setDraft("");
                }}
                onBlur={() => {
                  if (draft.trim()) {
                    addTokens(draft);
                    setDraft("");
                  }
                }}
                placeholder={emails.length ? "" : "Paste or type inbound emails…"}
                className="h-7 min-w-[180px] flex-1 bg-transparent px-1.5 font-mono text-[14px] text-text outline-none placeholder:text-tertiary"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="submit" disabled={loading} className="btn-primary h-11 px-5">
                {loading
                  ? "Working…"
                  : emails.length > 1
                    ? `Work ${emails.length} inbounds →`
                    : "Work inbound →"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={onCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary h-11 px-4"
                title="Upload a CSV or text file of emails"
              >
                ⇪ Upload CSV
              </button>
              <button
                type="button"
                onClick={() => runBatch(BURST)}
                disabled={loading}
                className="btn-secondary h-11 px-4"
                title="Simulate a morning of inbound — Quorum works them all in parallel"
              >
                ↯ Simulate {BURST.length}-lead burst
              </button>
              <button
                type="button"
                onClick={openSample}
                disabled={!sampleId}
                className="btn-secondary h-11 px-4"
                title={copy.pipeline.sampleHint}
              >
                {copy.pipeline.sampleCta}
              </button>
            </div>
          </form>
          {note && <p className="mt-2 text-[12px] text-tertiary">{note}</p>}
          {working != null && (
            <p className="mt-2.5 flex items-center gap-2 text-[12px] text-accent-soft">
              <span className="h-3 w-3 animate-spin rounded-full border border-accent-soft border-t-transparent" />
              Working {working} inbound{working === 1 ? "" : "s"} autonomously — enriching, mapping
              committees, and drafting. They appear below as they land.
            </p>
          )}
          {error && (
            <p className="mt-2 text-[12px] text-warn">
              {error}
              {error === copy.edge.personalEmail && sampleId && (
                <button onClick={openSample} className="ml-1 text-accent-soft underline">
                  Open a sample
                </button>
              )}
            </p>
          )}

          {/* Inbound webhook — the real ingestion seam */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="mono-label">Inbound webhook</span>
              <span className="text-[12px] text-tertiary">
                point your form, CRM, or inbox here — every lead is worked on arrival.
              </span>
            </div>
            {webhookUrl ? (
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded border border-border bg-bg px-3 py-2 font-mono text-[12px] text-secondary">
                  POST {webhookUrl}
                </code>
                <button onClick={copyHook} className="btn-secondary h-9 px-3 text-[12px]">
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            ) : (
              <button
                onClick={generateHook}
                disabled={minting}
                className="btn-secondary mt-2 h-9 px-3 text-[12px]"
              >
                {minting ? "Generating…" : "Generate webhook URL"}
              </button>
            )}
          </div>
        </div>

        {/* Accounts board */}
        <div className="mb-3 mt-8 flex items-center gap-2">
          <span className="mono-label">Active accounts</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {pipeline.length === 0 ? (
          <div className="cell flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-secondary">No accounts yet.</p>
            <p className="text-[13px] text-tertiary">
              Simulate an inbound burst above — Quorum works them all into account brains.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pipeline.map((a: any, i: number) => (
              <motion.button
                key={a._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: i * 0.03, ease: [0.175, 0.885, 0.32, 1.1] }}
                onClick={() => navigate(`/deal/${a._id}`)}
                className="cell group overflow-hidden p-0 text-left transition-all duration-150 ease-vercel hover:border-border-strong"
              >
                <div
                  className="h-[2px] w-full"
                  style={{ background: a.brandColors?.[0] ?? "#5B47EB" }}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Logo url={a.logoUrl} name={a.companyName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-text">
                        {a.companyName}
                      </p>
                      <p className="mono-label truncate normal-case tracking-normal text-tertiary">
                        {a.domain}
                      </p>
                    </div>
                    {a.score != null && (
                      <div className="text-right">
                        <div className="font-mono text-[15px] tabular-nums text-text">
                          {a.score}
                        </div>
                        <div className="mono-label text-tertiary">score</div>
                      </div>
                    )}
                  </div>

                  {/* mini stage progress */}
                  <div className="mt-3.5 flex items-center gap-1">
                    {STAGES.map((s, idx) => {
                      const reached = STAGE_INDEX[a.stage as keyof typeof STAGE_INDEX] ?? 0;
                      return (
                        <div
                          key={s.key}
                          className={`h-1 flex-1 rounded-full ${
                            idx <= reached ? "bg-accent" : "bg-surface2"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="mono-label normal-case tracking-normal text-secondary">
                      {STAGES[STAGE_INDEX[a.stage as keyof typeof STAGE_INDEX] ?? 0].label}
                      {a.committee > 0 ? ` · ${a.committee} in committee` : ""}
                    </span>
                    <span className="mono-label text-tertiary">{timeAgo(a.lastActivity)}</span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Logo({ url, name }: { url?: string; name?: string }) {
  if (url) {
    return (
      <img
        src={url}
        className="h-9 w-9 shrink-0 border border-border bg-white object-contain p-1"
        alt=""
        onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border font-mono text-sm text-secondary">
      {name?.[0] ?? "?"}
    </div>
  );
}
