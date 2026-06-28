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
  const sources: string[] = e.sources ?? [];

  return (
    <header className="flex items-center justify-between border-b border-border px-5 py-3">
      <div className="flex items-center gap-3.5">
        <Logo url={account?.logoUrl} name={account?.companyName} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold leading-none tracking-tight">
              {account?.companyName ?? "—"}
            </h1>
            <span className="font-mono text-[11px] text-tertiary">{account?.domain}</span>
            {sources.length > 0 && (
              <span className="mono-label hidden text-tertiary md:inline">
                · via {sources.join(" + ")}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <span key={i} className="chip py-0.5">
                {c}
              </span>
            ))}
            {(e.techStack ?? []).slice(0, 4).map((t: string) => (
              <span key={t} className="chip py-0.5" style={{ color: "var(--accent)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onRethread && (
          <button
            onClick={onRethread}
            disabled={rethreading}
            className="btn-secondary h-8 gap-2 px-2.5 text-[12px]"
            style={{ color: "var(--accent)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            {rethreading ? "Threading…" : "New inbound · same co."}
          </button>
        )}
        <div className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
          <span className="mono-label normal-case tracking-normal text-secondary">
            account brain live
          </span>
        </div>
        <div className="flex items-center gap-2 pl-1">
          <div className="flex h-6 w-6 items-center justify-center rounded border border-border">
            <div
              className="h-2.5 w-2.5 rounded-full border-[1.5px]"
              style={{ borderColor: "var(--accent)" }}
            />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Quorum</span>
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
        className="h-10 w-10 border border-border bg-white object-contain p-1"
        alt={name}
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 items-center justify-center border border-border bg-surface font-mono text-sm font-semibold"
      style={{ color: "var(--accent)" }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
