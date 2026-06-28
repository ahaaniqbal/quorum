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
  const visibleChips = [
    ...chips,
    ...(e.techStack ?? []).slice(0, 3),
  ];

  return (
    <header className="grid min-h-16 grid-cols-1 items-start gap-2 border-b border-border bg-bg px-4 py-3 lg:grid-cols-[minmax(180px,0.8fr)_minmax(150px,1fr)_auto] lg:items-center lg:gap-4 lg:px-5 lg:py-0">
      <div className="flex min-w-0 items-center gap-3">
        <Logo url={account?.logoUrl} name={account?.companyName} domain={account?.domain} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="truncate text-[15px] font-semibold leading-none tracking-tight">
              {account?.companyName ?? "Unknown account"}
            </h1>
            <span className="truncate font-mono text-[11px] text-tertiary">
              {account?.domain}
            </span>
            {sources.length > 0 && (
              <span className="mono-label hidden shrink-0 text-tertiary lg:inline">
                · via {sources.join(" + ")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-wrap items-center gap-1.5 overflow-hidden lg:flex">
        {visibleChips.slice(0, 5).map((chip, index) => {
          const isTech = index >= chips.length;
          return (
            <span
              key={`${chip}-${index}`}
              className="min-w-0 truncate border border-border bg-surface2 px-2 py-1 font-mono text-[11px] text-secondary"
              style={isTech ? { color: "var(--accent)" } : undefined}
            >
              {chip}
            </span>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        {onRethread && (
          <button
            onClick={onRethread}
            disabled={rethreading}
            className="btn-secondary h-9 shrink-0 whitespace-nowrap px-2.5 text-[12px]"
            style={{ color: "var(--accent)" }}
          >
            <span
              className="h-1.5 w-1.5 shrink-0"
              style={{ background: "var(--accent)" }}
            />
            {rethreading ? "Threading…" : "New inbound"}
          </button>
        )}
        <div className="flex h-9 min-w-0 shrink items-center gap-1.5 border border-border px-2.5">
          <span className="h-1.5 w-1.5 animate-pulse bg-good" />
          <span className="mono-label truncate normal-case tracking-normal text-secondary">
            account brain live
          </span>
        </div>
      </div>
    </header>
  );
}

function Logo({ url, name, domain }: { url?: string; name?: string; domain?: string }) {
  const fallbackUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;
  const [src, setSrc] = useState(url ?? fallbackUrl ?? null);

  if (src) {
    return (
      <img
        src={src}
        onError={() => {
          if (src !== fallbackUrl && fallbackUrl) {
            setSrc(fallbackUrl);
          } else {
            setSrc(null);
          }
        }}
        className="h-8 w-8 shrink-0 border border-border bg-white object-contain p-1"
        alt={name ?? ""}
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface font-mono text-sm font-semibold"
      style={{ color: "var(--accent)" }}
    >
      {name?.[0] ?? "?"}
    </div>
  );
}
