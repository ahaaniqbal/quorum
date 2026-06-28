import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const location = useLocation();
  const [flow, setFlow] = useState<"signIn" | "signUp">(
    location.pathname === "/login" ? "signIn" : "signUp"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "email" | "google" | "guest">(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) return setError("Enter a valid email");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    setLoading("email");
    try {
      await signIn("password", { email, password, flow });
    } catch (err: any) {
      setError(
        flow === "signUp"
          ? "Could not create account. That email may already be registered. Try signing in."
          : "Invalid email or password."
      );
      setLoading(null);
    }
  }

  async function google() {
    setError(null);
    setLoading("google");
    try {
      await signIn("google");
    } catch {
      setError("Google sign-in isn't available yet. Use email or continue as guest.");
      setLoading(null);
    }
  }

  async function guest() {
    setError(null);
    setLoading("guest");
    try {
      await signIn("anonymous");
    } catch {
      setError("Could not start a guest session. Try again.");
      setLoading(null);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <Link to="/" className="absolute left-5 top-4 flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100">
        <img src="/quorum-logo.svg" alt="Quorum" className="h-3.5 w-auto" />
        <span className="mono-label">GTM</span>
      </Link>
      <div className="pointer-events-none absolute right-5 top-4 mono-label">AI ACCOUNT EXECUTIVE</div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 flex items-center">
          <img src="/quorum-logo.svg" alt="Quorum" className="h-6 w-auto" />
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
            The autonomous AI account executive.
          </p>

          {/* Reviewer fast-path */}
          <button
            onClick={guest}
            disabled={loading !== null}
            className="btn-primary mt-5 h-9 w-full"
          >
            {loading === "guest" ? "Starting…" : "Explore as guest, no signup →"}
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="mono-label">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={google}
            disabled={loading !== null}
            className="btn-secondary h-9 w-full gap-2.5"
          >
            <GoogleIcon />
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <form onSubmit={onSubmit} className="mt-3 space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10 w-full border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              className="h-10 w-full border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
            />
            {error && <p className="text-[12px] text-warn">{error}</p>}
            <button
              type="submit"
              disabled={loading !== null}
              className="btn-secondary h-9 w-full"
            >
              {loading === "email"
                ? "Working…"
                : flow === "signUp"
                  ? "Create account with email"
                  : "Sign in with email"}
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
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
