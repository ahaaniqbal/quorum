import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";

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

  async function onSave() {
    await save({ ...form, onboarded: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="mono-label mb-1">Settings</div>
          <h1 className="text-[18px] font-semibold tracking-tight">Your workspace</h1>
        </div>
        <button onClick={() => signOut()} className="btn-secondary h-8 px-3 text-[12px]">
          Sign out
        </button>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-7">
        <div className="cell p-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-4 flex items-center gap-2">
            <span className="mono-label">Profile</span>
            <span className="text-[13px] text-secondary">
              — the AI rep pitches this on every call.
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
            <button onClick={onSave} className="btn-primary h-9 px-5">
              Save changes
            </button>
            {saved && <span className="mono-label text-good">✓ saved</span>}
          </div>
        </div>

        <div className="mt-4 cell p-5">
          <span className="mono-label">Signed in as</span>
          <p className="mt-1.5 font-mono text-[13px] text-text">
            {me?.user?.email ?? "—"}
          </p>
        </div>
      </div>
    </div>
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
