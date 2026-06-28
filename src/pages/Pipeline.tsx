import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";
import { Check, LogIn, Upload, Zap } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { STAGES, STAGE_INDEX } from "../lib/stages";
import { timeAgo } from "../lib/format";
import { copy } from "../copy";

const FREE_DOMAINS = new Set([
  "gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com",
  "proton.me", "protonmail.com", "aol.com", "live.com", "msn.com", "me.com",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A realistic "morning inbound" burst: varied real B2B companies Quorum works
// in parallel, so the rep never types one at a time.
const BURST = [
  "ceo@rippling.com", "gtm@brex.com", "sales@airtable.com", "ops@retool.com",
  "revenue@deel.com", "founder@mercury.com", "head@vanta.com", "lead@census.com",
];

type FilterKey = "all" | "attention" | "worked" | "demo";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All accounts" },
  { key: "attention", label: "Needs review" },
  { key: "worked", label: "Worked" },
  { key: "demo", label: "Demo data" },
];

const FLOW_STEPS = [
  {
    label: "Add leads",
    detail: "Paste emails, upload CSV, or connect the webhook.",
  },
  {
    label: "Account brain runs",
    detail: "Quorum enriches the company and maps the buying committee.",
  },
  {
    label: "Review gate",
    detail: "You approve drafts and risky actions before they go out.",
  },
  {
    label: "Actions land",
    detail: "Approved work becomes CRM notes, emails, meetings, and alerts.",
  },
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
  const me = useQuery(api.profiles.getMyProfile);
  const { signOut } = useAuthActions();
  const isGuest = (me?.user as any)?.isAnonymous;
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const webhookUrl = ingest?.url ?? null;
  const worked = pipeline.filter((a: any) => a.stage === "actioned").length;
  const needsReview = pipeline.filter((a: any) => a.stage !== "actioned").length;
  const reviewReady = pipeline.filter((a: any) => a.stage === "outreach").length;
  const demoAccounts = pipeline.filter((a: any) => a.isDemo).length;
  const filteredPipeline = pipeline.filter((a: any) => {
    if (filter === "attention") return a.stage !== "actioned";
    if (filter === "worked") return a.stage === "actioned";
    if (filter === "demo") return a.isDemo;
    return true;
  });

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
      <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label shrink-0 text-tertiary">Pipeline</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Accounts</h1>
        </div>
        <span className="mono-label tnum text-tertiary">
          {String(pipeline.length).padStart(2, "0")} active
        </span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-7">
        {isGuest && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-accent/30 bg-accent/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <LogIn size={15} strokeWidth={2} className="shrink-0 text-accent-soft" />
              <p className="text-[13px] text-text">
                You are exploring as a guest. Accounts you work here are not saved.
              </p>
            </div>
            <button onClick={() => signOut()} className="btn-primary h-8 shrink-0 px-3 text-[12px]">
              Sign in to save your pipeline
            </button>
          </div>
        )}

        {/* Command center summary */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Active accounts" value={pipeline.length} detail={`${worked} fully worked`} />
          <Metric
            label="Needs review"
            value={needsReview}
            detail={`${reviewReady} accounts ready for approval`}
            tone={needsReview ? "warn" : "good"}
            to="/review"
          />
          <Metric
            label="Lead source"
            value={webhookUrl ? "Live" : "Manual"}
            detail={webhookUrl ? "Webhook generated" : "Paste, CSV, or burst"}
            tone={webhookUrl ? "good" : "neutral"}
          />
          <Metric label="Demo data" value={demoAccounts} detail="Seeded walkthrough accounts" />
        </div>

        {/* Inbound entry */}
        <div className="cell p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-3 flex items-center gap-2">
            <span className="mono-label">Inbound</span>
            <span className="text-[13px] text-secondary">
              Quorum works every lead automatically. Paste a batch, connect a source, or take one
              by hand.
            </span>
          </div>
          <div className="mb-4 grid gap-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, index) => (
              <PipelineStep
                key={step.label}
                index={index + 1}
                label={step.label}
                detail={step.detail}
                status={
                  index === 0
                    ? webhookUrl
                      ? "live source"
                      : "manual source"
                    : index === 1
                      ? `${pipeline.length} active`
                      : index === 2
                        ? `${reviewReady} ready`
                        : `${worked} worked`
                }
                active={
                  index === 0 ||
                  (index === 1 && pipeline.length > 0) ||
                  (index === 2 && reviewReady > 0) ||
                  (index === 3 && worked > 0)
                }
              />
            ))}
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
              <button type="submit" disabled={loading} className="btn-primary h-9 px-4">
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
                className="btn-secondary h-9 px-4"
                title="Upload a CSV or text file of emails"
              >
                <Upload size={14} strokeWidth={2} /> Upload CSV
              </button>
              <button
                type="button"
                onClick={() => runBatch(BURST)}
                disabled={loading}
                className="btn-secondary h-9 px-4"
                title="Simulate a morning of inbound. Quorum works them all in parallel"
              >
                <Zap size={14} strokeWidth={2} /> Simulate {BURST.length}-lead burst
              </button>
              <button
                type="button"
                onClick={openSample}
                disabled={!sampleId}
                className="btn-secondary h-9 px-4"
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
              Working {working} inbound{working === 1 ? "" : "s"} autonomously, enriching, mapping
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

          {/* Inbound webhook: the real ingestion seam */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="mono-label">Inbound webhook</span>
              <span className="text-[12px] text-tertiary">
                point your form, CRM, or inbox here. Every lead is worked on arrival.
              </span>
            </div>
            {webhookUrl ? (
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded border border-border bg-bg px-3 py-2 font-mono text-[12px] text-secondary">
                  POST {webhookUrl}
                </code>
                <button onClick={copyHook} className="btn-secondary h-9 px-3 text-[12px]">
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={2.4} className="text-good" /> Copied
                    </>
                  ) : (
                    "Copy"
                  )}
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
          <span className="mono-label">Account queue</span>
          <div className="h-px flex-1 bg-border" />
          <span className="mono-label tnum text-tertiary">
            {String(filteredPipeline.length).padStart(2, "0")} shown
          </span>
          <Link
            to="/review"
            className="btn-secondary h-9 px-3 text-[12px]"
            title="Review generated outreach and action issues"
          >
            Review queue →
          </Link>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={active}
                className={`rounded border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                  active
                    ? "border-[#7a2d0d] bg-transparent text-accent-soft"
                    : "border-border bg-surface text-secondary hover:border-border-strong hover:text-text"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {filteredPipeline.length === 0 ? (
          <div className="cell flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="text-[14px] text-secondary">
              {pipeline.length === 0 ? "No accounts yet." : "No accounts match this view."}
            </p>
            <p className="text-[13px] text-tertiary">
              {pipeline.length === 0
                ? "Simulate an inbound burst above. Quorum works them all into account brains."
                : "Switch filters or run a new inbound to add more accounts."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredPipeline.map((a: any, i: number) => (
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
                  style={{ background: a.brandColors?.[0] ?? "var(--accent)" }}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Logo url={a.logoUrl} name={a.companyName} domain={a.domain} />
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
                      const reached = stageIndex(a.stage);
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
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <span className="mono-label normal-case tracking-normal text-secondary">
                      {stageLabel(a.stage)}
                      {a.committee > 0 ? ` · ${a.committee} in committee` : ""}
                    </span>
                    <span className="mono-label text-tertiary">{timeAgo(a.lastActivity)}</span>
                  </div>
                  <div className="mt-3 border-t border-border pt-2">
                    <p className="truncate text-[12px] text-tertiary">
                      <span className="mono-label normal-case tracking-normal text-tertiary">
                        review
                      </span>{" "}
                      {nextReview(a)}
                    </p>
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

function stageIndex(stage: string): number {
  return STAGE_INDEX[stage as keyof typeof STAGE_INDEX] ?? 0;
}

function stageLabel(stage: string): string {
  return STAGES[stageIndex(stage)].label;
}

function nextReview(account: any): string {
  if (account.stage === "actioned") return "Audit actions fired across the stack.";
  if (account.stage === "outreach") return "Review drafted outreach before sending.";
  if (account.stage === "committee") return "Check committee coverage and next move.";
  return account.lastLabel ?? "Confirm enrichment before autopilot continues.";
}

function PipelineStep({
  index,
  label,
  detail,
  status,
  active,
}: {
  index: number;
  label: string;
  detail: string;
  status: string;
  active: boolean;
}) {
  return (
    <div
      className={`relative border bg-surface p-3 ${
        active ? "border-border-strong" : "border-border"
      }`}
    >
      {active && (
        <span className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,var(--accent),#7a2d0d,#2a211b)]" />
      )}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={`mono-label tnum flex h-6 w-6 items-center justify-center border bg-transparent ${
            active ? "border-accent-subtle text-accent-soft" : "border-border text-tertiary"
          }`}
        >
          0{index}
        </span>
        <span className="mono-label normal-case tracking-normal text-tertiary">{status}</span>
      </div>
      <p className="text-[12px] font-semibold text-text">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-tertiary">{detail}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
  to,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "neutral" | "good" | "warn";
  to?: string;
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-text";
  const className = "cell block px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong";
  const content = (
    <>
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <p className="mono-label">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className={`font-mono text-[20px] tabular-nums ${toneClass}`}>{value}</p>
        <p className="truncate text-[12px] text-tertiary">{detail}</p>
      </div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <div className={className}>
      {content}
    </div>
  );
}

function Logo({ url, name, domain }: { url?: string; name?: string; domain?: string }) {
  const fallbackUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;
  const [src, setSrc] = useState(url ?? fallbackUrl ?? null);

  if (src) {
    return (
      <img
        src={src}
        className="h-9 w-9 shrink-0 border border-border bg-white object-contain p-1"
        alt={name ?? ""}
        onError={() => {
          if (src !== fallbackUrl && fallbackUrl) {
            setSrc(fallbackUrl);
          } else {
            setSrc(null);
          }
        }}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border font-mono text-sm text-secondary">
      {name?.[0] ?? "?"}
    </div>
  );
}
