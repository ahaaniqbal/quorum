import { useState } from "react";

export default function TopBar({
  account,
  onRethread,
  rethreading,
}: {
  account: any;
  onRethread?: () => void;
  rethreading?: boolean;
}) {
  const e = account?.enrichment ?? {};
  const chips: string[] = [
    e.funding,
    e.headcount && `${e.headcount} employees`,
    e.industry,
    e.revenue,
    e.founded && `Founded ${e.founded}`,
    e.hq,
  ].filter(Boolean);

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3.5">
      <div className="flex items-center gap-3.5">
        <Logo url={account?.logoUrl} name={account?.companyName} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold leading-none">
              {account?.companyName ?? "—"}
            </h1>
            <span className="text-xs text-secondary">{account?.domain}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span key={i} className="chip py-0.5">
                {c}
              </span>
            ))}
            {(e.techStack ?? []).slice(0, 4).map((t: string) => (
              <span key={t} className="chip py-0.5 text-accent-soft">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onRethread && (
          <button
            onClick={onRethread}
            disabled={rethreading}
            className="flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent-soft transition-colors hover:bg-accent/20 disabled:opacity-60"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-soft" />
            {rethreading ? "Threading…" : "New inbound · same company"}
          </button>
        )}
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
          <span className="text-xs text-secondary">Account brain live</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface">
            <div className="h-3 w-3 rounded-full border-2 border-accent" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Quorum</span>
        </div>
      </div>
    </header>
  );
}

function Logo({ url, name }: { url?: string; name?: string }) {
  const [ok, setOk] = useState(true);
  if (url && ok) {
    return (
      <img
        src={url}
        onError={() => setOk(false)}
        className="h-10 w-10 rounded-lg border border-border bg-white object-contain p-1"
        alt={name}
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-lg border bg-surface text-sm font-bold"
      style={{ borderColor: "var(--brand, #5B47EB)", color: "var(--brand, #5B47EB)" }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
