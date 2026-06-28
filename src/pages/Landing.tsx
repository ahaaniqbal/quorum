import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";

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
    <div className="bg-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface">
            <div className="h-3.5 w-3.5 rounded-full border-2 border-accent" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Quorum</span>
        </div>

        <h1 className="text-[42px] font-extrabold leading-[1.05] tracking-tight">
          The AI account executive that works the{" "}
          <span className="text-accent">whole room</span>.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-secondary">
          Drop your work email. Quorum enriches you live, qualifies you over a real
          voice call, maps your buying committee, and never forgets a conversation.
        </p>

        <form onSubmit={onStart} className="mt-8 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoFocus
            className="h-11 flex-1 rounded-md border border-border bg-surface px-4 text-[15px] text-text outline-none transition-colors placeholder:text-secondary/60 focus:border-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-11 px-5"
          >
            {loading ? "Spinning up…" : "Start"}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-risk">{error}</p>}

        <div className="mt-6 flex flex-wrap gap-2">
          {["ramp.com", "linear.app", "vercel.com", "notion.so"].map((d) => (
            <button
              key={d}
              onClick={() => setEmail(`alex@${d}`)}
              className="chip hover:border-accent/60 hover:text-text"
            >
              alex@{d}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
