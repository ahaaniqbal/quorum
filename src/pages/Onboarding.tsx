import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useAction, useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Database,
  Inbox,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { saveJson } from "../lib/preferences";

const FREE_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
  "hey.com",
  "fastmail.com",
]);

type LaunchPath = "pipeline" | "setup" | "review";

type ProfileForm = {
  name: string;
  companyName: string;
  product: string;
  valueProp: string;
  icp: string;
};

const LOOP_STEPS: Array<{
  label: string;
  owner: string;
  detail: string;
  icon: LucideIcon;
}> = [
  {
    label: "Ingest",
    owner: "Quorum",
    detail: "Paste leads, upload CSVs, or generate a webhook for live inbound.",
    icon: Inbox,
  },
  {
    label: "Build brain",
    owner: "AI",
    detail: "Research the account, buying committee, roles, and likely next move.",
    icon: BrainCircuit,
  },
  {
    label: "Review gate",
    owner: "You",
    detail: "Approve customer-facing drafts and risky actions before they leave Quorum.",
    icon: ShieldCheck,
  },
  {
    label: "Close loop",
    owner: "Quorum",
    detail: "Approved work becomes CRM updates, messages, meetings, and alerts.",
    icon: Send,
  },
];

const SYSTEMS: Array<{ label: string; detail: string; icon: LucideIcon }> = [
  { label: "Inbound", detail: "Website, CRM, CSV, or email source", icon: Webhook },
  { label: "Slack", detail: "Qualified account alerts", icon: MessageSquare },
  { label: "CRM", detail: "Accounts, contacts, notes, and deals", icon: Database },
  { label: "Email", detail: "Approved committee outreach", icon: Mail },
];

const LAUNCH_PATHS: Array<{
  key: LaunchPath;
  label: string;
  detail: string;
  next: string;
  icon: LucideIcon;
}> = [
  {
    key: "pipeline",
    label: "Work first inbound",
    detail: "Paste a lead, upload CSV, or run the sample account path.",
    next: "/pipeline",
    icon: Inbox,
  },
  {
    key: "setup",
    label: "Connect systems",
    detail: "Generate the webhook, connect destinations, and set launch controls.",
    next: "/setup",
    icon: Webhook,
  },
  {
    key: "review",
    label: "Open review gate",
    detail: "See drafts, action issues, and the human approval checkpoint.",
    next: "/review",
    icon: ShieldCheck,
  },
];

const ROUTE_BY_PATH: Record<LaunchPath, string> = {
  pipeline: "/pipeline",
  setup: "/setup",
  review: "/review",
};

export default function Onboarding({
  defaultName,
  defaultEmail,
  defaultProfile,
}: {
  defaultName?: string;
  defaultEmail?: string;
  defaultProfile?: Partial<ProfileForm>;
}) {
  const navigate = useNavigate();
  const save = useMutation(api.profiles.saveProfile);
  const autofill = useAction(api.actions.autofillSeller);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autofilling, setAutofilling] = useState(false);
  const [autofilledFrom, setAutofilledFrom] = useState<string | null>(null);
  const [launchPath, setLaunchPath] = useState<LaunchPath>("pipeline");
  const [form, setForm] = useState<ProfileForm>({
    name: defaultProfile?.name ?? defaultName ?? "",
    companyName: defaultProfile?.companyName ?? "",
    product: defaultProfile?.product ?? "",
    valueProp: defaultProfile?.valueProp ?? "",
    icp: defaultProfile?.icp ?? "",
  });

  const domain = defaultEmail?.split("@")[1]?.toLowerCase();
  const businessDomain = domain && !FREE_DOMAINS.has(domain);

  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !defaultEmail || !businessDomain) return;
    ran.current = true;
    setAutofilling(true);
    autofill({ email: defaultEmail })
      .then((res) => {
        if (!res) return;
        setForm((current) => ({
          ...current,
          companyName: current.companyName || res.companyName,
          product: current.product || res.product,
          valueProp: current.valueProp || res.valueProp,
          icp: current.icp || res.icp,
        }));
        if (res.product || res.valueProp) setAutofilledFrom(res.domain);
      })
      .catch(() => {})
      .finally(() => setAutofilling(false));
  }, [autofill, businessDomain, defaultEmail]);

  const steps = useMemo(
    () => [
      {
        label: "Orient",
        detail: "See how Quorum works.",
        done: step > 0,
      },
      {
        label: "Profile",
        detail: "Tell the AI what you sell.",
        done: step > 1,
      },
      {
        label: "Controls",
        detail: "Understand the launch checklist.",
        done: step > 2,
      },
      {
        label: "Next action",
        detail: "Choose where to land.",
        done: false,
      },
    ],
    [step]
  );

  const profileComplete =
    form.name.trim().length > 1 &&
    form.companyName.trim().length > 1 &&
    form.product.trim().length > 1;
  const canContinue =
    step === 0 || (step === 1 && profileComplete) || (step === 2 && profileComplete) || (step === 3 && profileComplete);

  const set = (key: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  async function finish() {
    setSaving(true);
    try {
      await save({ ...form, onboarded: true });
      saveJson("quorum.launchPlan", {
        path: launchPath,
        completedAt: new Date().toISOString(),
        companyName: form.companyName,
      });
      navigate(ROUTE_BY_PATH[launchPath], { replace: true });
    } catch {
      setSaving(false);
    }
  }

  function next() {
    if (step === 3) {
      void finish();
      return;
    }
    setStep((current) => Math.min(current + 1, 3));
  }

  return (
    <div className="grid-lines relative min-h-screen overflow-x-hidden bg-bg text-text">
      <div className="border-b border-border bg-bg">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <img src="/quorum-logo.svg" alt="Quorum" className="h-4 w-auto" />
          <div className="mono-label tnum text-tertiary">FIRST RUN · STEP {step + 1} / 4</div>
        </div>
      </div>

      <main className="mx-auto grid min-h-[calc(100vh-56px)] max-w-7xl gap-5 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr]">
        <aside className="cell flex min-h-[420px] flex-col p-5 md:min-h-[620px]">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div>
            <p className="mono-label text-accent-soft">Launch map</p>
            <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
              Get from blank workspace to first account loop.
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-secondary">
              Quorum is most useful when the path is obvious: add leads, let the account brain work,
              review what matters, then approve actions into your systems.
            </p>
          </div>

          <div className="mt-7 space-y-2">
            {steps.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setStep(index)}
                disabled={index > 1 && !profileComplete}
                className={`flex w-full items-start gap-3 border px-3 py-3 text-left transition-colors ${
                  step === index
                    ? "border-accent-subtle bg-surface"
                    : "border-border bg-transparent hover:border-border-strong"
                } disabled:pointer-events-none disabled:opacity-45`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border text-[11px] ${
                    item.done ? "border-good text-good" : step === index ? "border-accent text-accent-soft" : "border-border text-tertiary"
                  }`}
                >
                  {item.done ? <Check size={13} strokeWidth={2.2} /> : String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-text">{item.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-tertiary">{item.detail}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto border-t border-border pt-5">
            <p className="mono-label">Operator cadence</p>
            <div className="mt-3 space-y-3 text-[12px] leading-relaxed text-secondary">
              <p>
                <span className="text-text">Now:</span> finish setup and run one lead by hand.
              </p>
              <p>
                <span className="text-text">Daily:</span> review drafts and action issues.
              </p>
              <p>
                <span className="text-text">After trust:</span> raise autonomy for safe, high-score actions.
              </p>
            </div>
          </div>
        </aside>

        <section className="cell min-h-[520px] overflow-hidden md:min-h-[620px]">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="flex min-h-[520px] flex-col md:min-h-[620px]"
          >
            {step === 0 && <LoopIntro />}
            {step === 1 && (
              <ProfileStep
                form={form}
                set={set}
                autofilling={autofilling}
                autofilledFrom={autofilledFrom}
                domain={domain}
              />
            )}
            {step === 2 && <ControlsStep />}
            {step === 3 && <LaunchPathStep launchPath={launchPath} setLaunchPath={setLaunchPath} />}

            <div className="mt-auto flex flex-col-reverse gap-2 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(current - 1, 0))}
                disabled={step === 0 || saving}
                className="btn-secondary h-10 w-full px-4 disabled:pointer-events-none sm:w-auto"
              >
                Back
              </button>
              <button
                type="button"
                onClick={next}
                disabled={!canContinue || saving}
                className="btn-primary h-10 w-full px-5 sm:w-auto"
              >
                {step === 3 ? (saving ? "Launching…" : "Enter Quorum") : "Continue"}
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function LoopIntro() {
  return (
    <div className="p-6">
      <p className="mono-label text-accent-soft">Operating loop</p>
      <h2 className="mt-4 max-w-3xl text-[36px] font-semibold leading-[1.05] tracking-tight">
        Quorum works the account until it needs your judgment.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-secondary">
        The first-run goal is not to configure everything. It is to understand the loop, give the
        account brain enough context, and know the exact next action after setup.
      </p>

      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {LOOP_STEPS.map((item, index) => (
          <ProcessCard key={item.label} item={item} index={index + 1} />
        ))}
      </div>

      <div className="mt-6 border border-accent-subtle bg-[#11100e] p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent-soft" />
          <div>
            <p className="text-[14px] font-medium text-text">The mental model</p>
            <p className="mt-1 text-[13px] leading-relaxed text-secondary">
              Quorum runs continuously. You step in at review gates, launch gaps, and high-risk
              decisions. Everything else should feel like watching work finish itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({
  form,
  set,
  autofilling,
  autofilledFrom,
  domain,
}: {
  form: ProfileForm;
  set: (key: keyof ProfileForm) => (event: ChangeEvent<HTMLInputElement>) => void;
  autofilling: boolean;
  autofilledFrom: string | null;
  domain?: string;
}) {
  return (
    <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_340px]">
      <div className="p-6">
        <p className="mono-label text-accent-soft">Seller profile</p>
        <h2 className="mt-4 max-w-2xl text-[32px] font-semibold leading-tight tracking-tight">
          Give the account brain the company context it should never guess.
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-secondary">
          This profile is used in every next move, draft, call prompt, and follow-up. Keep it plain
          and concrete.
        </p>

        {autofilling ? (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-accent-soft">
            <span className="h-3 w-3 animate-spin border border-accent-soft border-t-transparent" />
            Reading {domain} to prefill the profile.
          </div>
        ) : autofilledFrom ? (
          <div className="mt-4 flex items-center gap-2 text-[12px] text-accent-soft">
            <CheckCircle2 size={14} strokeWidth={2.2} />
            Pre-filled from {autofilledFrom}. Edit anything before launch.
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field label="Your name" value={form.name} onChange={set("name")} placeholder="Alex Rivera" autoFocus />
          <Field label="Company" value={form.companyName} onChange={set("companyName")} placeholder="Quorum" />
          <Field
            label="What you sell"
            value={form.product}
            onChange={set("product")}
            placeholder="AI account executive for revenue teams"
            wide
          />
          <Field
            label="Outcome"
            value={form.valueProp}
            onChange={set("valueProp")}
            placeholder="Works inbound leads, maps the committee, and drafts next actions"
            wide
          />
          <Field
            label="Best-fit customer"
            value={form.icp}
            onChange={set("icp")}
            placeholder="B2B SaaS teams with high-intent inbound and complex buying committees"
            wide
          />
        </div>
      </div>

      <aside className="border-t border-border p-6 lg:border-l lg:border-t-0">
        <p className="mono-label">What this powers</p>
        <div className="mt-4 space-y-3">
          {[
            "Account summaries that describe the buyer in your language.",
            "Drafts that pitch your actual product, not a generic sales tool.",
            "Next moves that match your customer type and launch stage.",
            "Review gates that explain why Quorum wants to act.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 border border-border bg-transparent p-3">
              <Check size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-accent-soft" />
              <p className="text-[12px] leading-relaxed text-secondary">{item}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ControlsStep() {
  return (
    <div className="p-6">
      <p className="mono-label text-accent-soft">Launch controls</p>
      <h2 className="mt-4 max-w-3xl text-[34px] font-semibold leading-tight tracking-tight">
        Connect enough systems for Quorum to act, then keep approval on while trust builds.
      </h2>
      <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-secondary">
        First customers should understand exactly what happens. Start with inbound, Slack, CRM, and
        email. Calendar is useful once follow-up scheduling is part of the pilot.
      </p>

      <div className="mt-7 grid gap-3 lg:grid-cols-4">
        {SYSTEMS.map((system, index) => (
          <div key={system.label} className="border border-border bg-transparent p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center border border-accent-subtle text-accent-soft">
                <system.icon size={18} strokeWidth={2.1} />
              </span>
              <span className="mono-label tnum text-tertiary">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <p className="mt-5 text-[14px] font-medium text-text">{system.label}</p>
            <p className="mt-2 text-[12px] leading-relaxed text-secondary">{system.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-3 lg:grid-cols-3">
        <LaunchRule label="Safe default" detail="Human approval stays on before customer-facing outreach." />
        <LaunchRule label="First review" detail="Check drafts and action issues at least once every workday." />
        <LaunchRule label="Autonomy later" detail="Only raise automation after accepted drafts are consistent." />
      </div>
    </div>
  );
}

function LaunchPathStep({
  launchPath,
  setLaunchPath,
}: {
  launchPath: LaunchPath;
  setLaunchPath: (path: LaunchPath) => void;
}) {
  return (
    <div className="p-6">
      <p className="mono-label text-accent-soft">First action</p>
      <h2 className="mt-4 max-w-3xl text-[34px] font-semibold leading-tight tracking-tight">
        Choose where Quorum should take you after onboarding.
      </h2>
      <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-secondary">
        You can change everything later. This choice only decides the next screen so the first
        session has momentum.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-3">
        {LAUNCH_PATHS.map((path) => {
          const selected = launchPath === path.key;
          return (
            <button
              key={path.key}
              type="button"
              onClick={() => setLaunchPath(path.key)}
              className={`group min-h-[220px] border p-4 text-left transition-colors ${
                selected ? "border-accent bg-[#11100e]" : "border-border bg-transparent hover:border-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center border ${
                    selected ? "border-accent text-accent-soft" : "border-accent-subtle text-secondary"
                  }`}
                >
                  <path.icon size={20} strokeWidth={2.1} />
                </span>
                <span className={`mono-label ${selected ? "text-accent-soft" : "text-tertiary"}`}>
                  {selected ? "selected" : path.next}
                </span>
              </div>
              <p className="mt-7 text-[17px] font-semibold tracking-tight text-text">{path.label}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-secondary">{path.detail}</p>
              <div className="mt-8 flex items-center gap-2 text-[12px] text-accent-soft">
                <span>Start here</span>
                <ArrowRight size={14} strokeWidth={2.2} className="transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border border-border bg-transparent p-4">
        <p className="mono-label">What happens next</p>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">
          Quorum will open the selected area with your profile saved. The home screen becomes the
          command center: what needs attention, what ran recently, and when you should check again.
        </p>
      </div>
    </div>
  );
}

function ProcessCard({
  item,
  index,
}: {
  item: (typeof LOOP_STEPS)[number];
  index: number;
}) {
  return (
    <div className="border border-border bg-transparent p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center border border-accent-subtle text-accent-soft">
          <item.icon size={18} strokeWidth={2.1} />
        </span>
        <span className="mono-label tnum text-tertiary">{String(index).padStart(2, "0")}</span>
      </div>
      <p className="mt-5 text-[15px] font-semibold tracking-tight text-text">{item.label}</p>
      <p className="mt-1 mono-label normal-case tracking-normal text-accent-soft">{item.owner}</p>
      <p className="mt-3 text-[12px] leading-relaxed text-secondary">{item.detail}</p>
    </div>
  );
}

function LaunchRule({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="border border-border bg-transparent p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={17} strokeWidth={2.1} className="mt-0.5 shrink-0 text-accent-soft" />
        <div>
          <p className="text-[13px] font-medium text-text">{label}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-secondary">{detail}</p>
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
  wide,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  wide?: boolean;
  autoFocus?: boolean;
}) {
  const id = `onboarding-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mono-label mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="h-11 w-full border border-border bg-surface px-3 text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
      />
    </div>
  );
}
