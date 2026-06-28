import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";

const SAMPLES = ["eric@ramp.com", "dylan@figma.com", "patrick@stripe.com", "alex@linear.app"];

export default function Landing() {
  const navigate = useNavigate();
  const enrich = useAction(api.actions.enrichFromEmail);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Enter a valid work email");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const accountId = await enrich({ email });
      navigate(`/deal/${accountId}`);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="grid-lines relative flex min-h-screen flex-col overflow-hidden bg-bg">
      {/* corner mono labels */}
      <div className="pointer-events-none absolute left-5 top-4 mono-label">QUORUM // GTM</div>
      <div className="pointer-events-none absolute right-5 top-4 mono-label">
        AI ACCOUNT EXECUTIVE
      </div>
      <div className="pointer-events-none absolute bottom-4 left-5 mono-label">
        [ multi-thread · remember · act ]
      </div>
      <div className="pointer-events-none absolute bottom-4 right-5 mono-label">v1.0</div>

      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[680px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "color-mix(in srgb, var(--accent) 22%, transparent)" }}
      />

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.1] }}
          className="w-full max-w-xl"
        >
          <div className="mb-7 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-border">
              <div
                className="h-3 w-3 rounded-full border-[1.5px]"
                style={{ borderColor: "var(--accent)" }}
              />
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Quorum</span>
          </div>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
            <span className="mono-label normal-case tracking-normal text-secondary">
              works the whole buying committee live
            </span>
          </div>

          <h1 className="text-display-lg text-balance">
            The AI account executive that works the{" "}
            <span style={{ color: "var(--accent)" }}>whole room</span>.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-secondary">
            Drop your work email. Quorum enriches you live, qualifies you over a real
            voice call, maps your buying committee, and never forgets a conversation.
          </p>

          <form onSubmit={onStart} className="mt-8">
            <div className="flex gap-2">
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
              <button type="submit" disabled={loading} className="btn-primary h-9 px-4">
                {loading ? "Spinning up…" : "Start →"}
              </button>
            </div>
            {error && <p className="mt-2 font-mono text-[11px] text-risk">{error}</p>}
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2">
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
        </motion.div>
      </div>
    </div>
  );
}
