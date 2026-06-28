import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";
import { STAGES, STAGE_INDEX } from "../lib/stages";
import { timeAgo } from "../lib/format";
import { copy } from "../copy";

const SAMPLES = ["eric@ramp.com", "dylan@figma.com", "patrick@stripe.com", "alex@linear.app"];
const FREE_DOMAINS = new Set([
  "gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com",
  "proton.me", "protonmail.com", "aol.com", "live.com", "msn.com", "me.com",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Pipeline() {
  const navigate = useNavigate();
  const enrich = useAction(api.actions.enrichFromEmail);
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const sampleId = useQuery(api.queries.getSampleAccountId, {});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSample() {
    if (sampleId) navigate(`/deal/${sampleId}`);
  }

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    const domain = trimmed.split("@")[1]?.toLowerCase();
    if (!EMAIL_RE.test(trimmed)) return setError(copy.edge.invalidEmail);
    if (domain && FREE_DOMAINS.has(domain)) return setError(copy.edge.personalEmail);
    setError(null);
    setLoading(true);
    try {
      const accountId = await enrich({ email: trimmed });
      navigate(`/deal/${accountId}`);
    } catch (err: any) {
      // Never dead-end: surface a friendly note, keep the judge moving.
      setError(copy.edge.genericError);
      setLoading(false);
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
        {/* New inbound entry */}
        <div className="cell p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-3 flex items-center gap-2">
            <span className="mono-label">New inbound</span>
            <span className="text-[13px] text-secondary">
              — drop a work email, Quorum works the whole account.
            </span>
          </div>
          <form onSubmit={onStart} noValidate className="flex gap-2">
            <div className="relative flex-1">
              <span className="mono-label pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
                ▸
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
                className="h-11 w-full rounded border border-border bg-surface pl-8 pr-4 font-mono text-[14px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary h-11 px-5">
              {loading ? "Enriching…" : "Run Quorum →"}
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
          </form>
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mono-label">{copy.pipeline.sampleHint}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="mono-label">try</span>
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => setEmail(s)}
                className="chip transition-colors duration-150 hover:border-border-strong hover:text-text"
              >
                {s}
              </button>
            ))}
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
              Drop a work email above to spin up your first account brain.
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
