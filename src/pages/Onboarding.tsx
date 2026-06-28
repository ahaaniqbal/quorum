import { useEffect, useRef, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";

const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "ymail.com", "outlook.com",
  "hotmail.com", "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com",
  "zoho.com", "hey.com", "fastmail.com",
]);

export default function Onboarding({
  defaultName,
  defaultEmail,
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const save = useMutation(api.profiles.saveProfile);
  const autofill = useAction(api.actions.autofillSeller);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofilledFrom, setAutofilledFrom] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: defaultName ?? "",
    companyName: "",
    product: "",
    valueProp: "",
    icp: "",
  });

  const domain = defaultEmail?.split("@")[1]?.toLowerCase();
  const businessDomain = domain && !FREE_DOMAINS.has(domain);

  // Read the seller's own company from their business-email domain and pre-fill
  // the profile. Runs once; only fills fields the user hasn't already typed.
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !defaultEmail || !businessDomain) return;
    ran.current = true;
    setAutofilling(true);
    autofill({ email: defaultEmail })
      .then((res) => {
        if (!res) return;
        setForm((f) => ({
          ...f,
          companyName: f.companyName || res.companyName,
          product: f.product || res.product,
          valueProp: f.valueProp || res.valueProp,
          icp: f.icp || res.icp,
        }));
        if (res.product || res.valueProp) setAutofilledFrom(res.domain);
      })
      .catch(() => {})
      .finally(() => setAutofilling(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canNext =
    step === 0 ? form.name.trim().length > 1 : form.companyName.trim() && form.product.trim();

  async function finish() {
    setSaving(true);
    try {
      await save({ ...form, onboarded: true });
      // Authed gate re-renders into the app once profile.onboarded flips.
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="grid-lines relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6">
      <div className="pointer-events-none absolute left-5 top-4 mono-label">QUORUM // ONBOARDING</div>
      <div className="pointer-events-none absolute right-5 top-4 mono-label tnum">
        STEP {step + 1} / 2
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-5 flex items-center gap-1.5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-accent" : "bg-surface2"
              }`}
            />
          ))}
        </div>

        <div className="cell p-6">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />

          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 ? (
              <div>
                <h1 className="text-[20px] font-semibold tracking-tight">Welcome to Quorum</h1>
                <p className="mt-1 text-[13px] text-secondary">
                  Your autonomous account executive. First — what should we call you?
                </p>
                <div className="mt-5">
                  <label className="mono-label mb-1.5 block">Your name</label>
                  <input
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Alex Rivera"
                    autoFocus
                    className="h-10 w-full rounded border border-border bg-surface px-3 text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-[20px] font-semibold tracking-tight">What do you sell?</h1>
                <p className="mt-1 text-[13px] text-secondary">
                  Quorum's AI rep pitches <span className="text-text">your</span> product on every
                  call — so this matters.
                </p>
                {autofilling ? (
                  <div className="mt-3 flex items-center gap-2 text-[12px] text-accent-soft">
                    <span className="h-3 w-3 animate-spin rounded-full border border-accent-soft border-t-transparent" />
                    Reading {domain} to fill this in…
                  </div>
                ) : autofilledFrom ? (
                  <div className="mt-3 flex items-center gap-1.5 text-[12px] text-accent-soft">
                    <span>✦</span> Pre-filled from {autofilledFrom} — edit anything.
                  </div>
                ) : null}
                <div className="mt-5 space-y-3">
                  <Field label="Your company" value={form.companyName} onChange={set("companyName")} placeholder="Acme Inc." />
                  <Field
                    label="What you sell (one line)"
                    value={form.product}
                    onChange={set("product")}
                    placeholder="An AI analytics platform for RevOps teams"
                  />
                  <Field
                    label="Value prop (optional)"
                    value={form.valueProp}
                    onChange={set("valueProp")}
                    placeholder="Cut reporting time 80% with self-serve dashboards"
                  />
                  <Field
                    label="Ideal customer (optional)"
                    value={form.icp}
                    onChange={set("icp")}
                    placeholder="Series B–D B2B SaaS, 200–2000 employees"
                  />
                </div>
              </div>
            )}
          </motion.div>

          <div className="mt-6 flex items-center justify-between">
            {step === 1 ? (
              <button onClick={() => setStep(0)} className="btn-secondary h-9 px-4">
                Back
              </button>
            ) : (
              <span />
            )}
            {step === 0 ? (
              <button onClick={() => setStep(1)} disabled={!canNext} className="btn-primary h-9 px-5">
                Continue →
              </button>
            ) : (
              <button onClick={finish} disabled={!canNext || saving} className="btn-primary h-9 px-5">
                {saving ? "Setting up…" : "Enter Quorum →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mono-label mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded border border-border bg-surface px-3 text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
      />
    </div>
  );
}
