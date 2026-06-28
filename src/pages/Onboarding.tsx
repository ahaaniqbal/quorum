import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import { api } from "../../convex/_generated/api";

export default function Onboarding({ defaultName }: { defaultName?: string }) {
  const save = useMutation(api.profiles.saveProfile);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: defaultName ?? "",
    companyName: "",
    product: "",
    valueProp: "",
    icp: "",
  });

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
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full blur-[130px]"
        style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}
      />

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
