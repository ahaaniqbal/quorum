import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { motion } from "framer-motion";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Enter a valid email");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow });
    } catch (err: any) {
      setError(
        flow === "signUp"
          ? "Could not create account — that email may already exist."
          : "Invalid email or password."
      );
      setLoading(false);
    }
  }

  return (
    <div className="grid-lines relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6">
      <div className="pointer-events-none absolute left-5 top-4 mono-label">QUORUM // GTM</div>
      <div className="pointer-events-none absolute right-5 top-4 mono-label">AI ACCOUNT EXECUTIVE</div>
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.1] }}
        className="relative z-10 w-full max-w-sm"
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

        <div className="cell p-6">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />

          <h1 className="text-[20px] font-semibold tracking-tight">
            {flow === "signUp" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-[13px] text-secondary">
            {flow === "signUp"
              ? "Spin up your autonomous account executive."
              : "Sign in to your pipeline."}
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <div>
              <label className="mono-label mb-1.5 block">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
                className="h-10 w-full rounded border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
              />
            </div>
            <div>
              <label className="mono-label mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 w-full rounded border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
              />
            </div>
            {error && <p className="font-mono text-[11px] text-risk">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary h-10 w-full">
              {loading
                ? "Working…"
                : flow === "signUp"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <button
            onClick={() => {
              setFlow((f) => (f === "signUp" ? "signIn" : "signUp"));
              setError(null);
            }}
            className="mt-4 w-full text-center text-[12px] text-secondary transition-colors hover:text-text"
          >
            {flow === "signUp"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
