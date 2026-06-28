import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Check } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import {
  loadAutonomyPrefs,
  saveAutonomyPrefs,
  type AutonomyMode,
  type AutonomyPrefs,
} from "../lib/preferences";

export default function Settings() {
  const me = useQuery(api.profiles.getMyProfile);
  const save = useMutation(api.profiles.saveProfile);
  const { signOut } = useAuthActions();

  const [form, setForm] = useState({
    name: "",
    companyName: "",
    product: "",
    valueProp: "",
    icp: "",
  });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autonomy, setAutonomy] = useState<AutonomyPrefs>(() => loadAutonomyPrefs());
  const [rulesSaved, setRulesSaved] = useState(false);

  useEffect(() => {
    if (me?.profile) {
      setForm({
        name: me.profile.name ?? "",
        companyName: me.profile.companyName ?? "",
        product: me.profile.product ?? "",
        valueProp: me.profile.valueProp ?? "",
        icp: me.profile.icp ?? "",
      });
    }
  }, [me?.profile]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setAutonomyMode = (mode: AutonomyMode) => setAutonomy((current) => ({ ...current, mode }));

  async function onSave() {
    setSaveError(false);
    setSaving(true);
    try {
      await save({ ...form, onboarded: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3500);
    } finally {
      setSaving(false);
    }
  }

  function onSaveRules() {
    saveAutonomyPrefs(autonomy);
    setRulesSaved(true);
    setTimeout(() => setRulesSaved(false), 2000);
  }

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label shrink-0 text-tertiary">Settings</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Your workspace</h1>
        </div>
        <button onClick={() => signOut()} className="btn-secondary h-8 px-3 text-[12px]">
          Sign out
        </button>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 px-6 py-7 lg:grid-cols-[1fr_390px]">
        <div className="cell p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-4 flex items-center gap-2">
            <span className="mono-label">Profile</span>
            <span className="text-[13px] text-secondary">
              The AI rep uses this in every draft and call.
            </span>
          </div>
          <div className="space-y-3">
            <Field label="Your name" value={form.name} onChange={set("name")} />
            <Field label="Company" value={form.companyName} onChange={set("companyName")} />
            <Field label="What you sell" value={form.product} onChange={set("product")} />
            <Field label="Value prop" value={form.valueProp} onChange={set("valueProp")} />
            <Field label="Ideal customer" value={form.icp} onChange={set("icp")} />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={onSave} disabled={saving} className="btn-primary h-9 px-5">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="mono-label flex items-center gap-1 text-good">
                <Check size={12} strokeWidth={2.4} /> saved
              </span>
            )}
            {saveError && (
              <span className="mono-label normal-case tracking-normal text-risk">
                Could not save. Try again.
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="cell p-5">
            <span className="plus plus-tl" />
            <span className="plus plus-tr" />
            <span className="plus plus-bl" />
            <span className="plus plus-br" />
            <div className="mb-4">
              <span className="mono-label">Autonomy rules</span>
              <p className="mt-1 text-[13px] leading-relaxed text-secondary">
                Control exactly when Quorum drafts, waits, or sends.
              </p>
            </div>
            <div className="space-y-2">
              <RuleOption
                active={autonomy.mode === "draft_only"}
                label="Draft only"
                desc="Never sends. Good for first evaluation."
                onClick={() => setAutonomyMode("draft_only")}
              />
              <RuleOption
                active={autonomy.mode === "approve_to_send"}
                label="Require approval"
                desc="Drafts wait in Review until a human approves."
                onClick={() => setAutonomyMode("approve_to_send")}
              />
              <RuleOption
                active={autonomy.mode === "auto_send"}
                label="Auto-send after score"
                desc="Approved for high-confidence accounts only."
                onClick={() => setAutonomyMode("auto_send")}
              />
            </div>

            <label className="mt-4 block">
              <span className="mono-label mb-1.5 block">Minimum score for auto-send</span>
              <input
                type="number"
                min={0}
                max={100}
                value={autonomy.minScore}
                onChange={(event) => {
                  const n = Number(event.target.value);
                  setAutonomy((current) => ({
                    ...current,
                    minScore: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0,
                  }));
                }}
                className="h-10 w-full rounded border border-border bg-surface px-3 font-mono text-[13px] text-text outline-none focus:border-border-strong"
              />
            </label>

            <label className="mt-3 flex cursor-pointer items-start gap-2 rounded border border-border bg-surface px-3 py-2">
              <input
                type="checkbox"
                checked={autonomy.slackOnlyBooked}
                onChange={(event) =>
                  setAutonomy((current) => ({
                    ...current,
                    slackOnlyBooked: event.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                <span className="block text-[13px] text-text">Slack only after meeting booked</span>
                <span className="block text-[12px] text-tertiary">
                  Keeps noisy accounts out of the revenue channel.
                </span>
              </span>
            </label>

            <div className="mt-5 flex items-center gap-3">
              <button onClick={onSaveRules} className="btn-primary h-9 px-5">
                Save rules
              </button>
              {rulesSaved && <span className="mono-label text-good">saved</span>}
            </div>
          </div>

          <div className="cell p-5">
            <span className="mono-label">Signed in as</span>
            <p className="mt-1.5 font-mono text-[13px] text-text">
              {me?.user?.email ?? "Not signed in"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleOption({
  active,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded border px-3 py-2 text-left transition-colors ${
        active
          ? "border-accent/40 bg-accent/15"
          : "border-border bg-surface hover:border-border-strong"
      }`}
    >
      <span className="block text-[13px] font-medium text-text">{label}</span>
      <span className="mt-0.5 block text-[12px] text-tertiary">{desc}</span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mono-label mb-1.5 block">{label}</label>
      <input
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded border border-border bg-surface px-3 text-[13px] text-text outline-none transition-colors duration-150 focus:border-border-strong"
      />
    </div>
  );
}
