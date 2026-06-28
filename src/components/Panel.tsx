import type { ReactNode } from "react";

// A blueprint "cell": bordered panel with a monospace corner label, an index
// tag, and plus-cross markers at the corners (Firecrawl grid signature).
export default function Panel({
  label,
  index,
  desc,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  label: string;
  index?: string;
  desc?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`cell flex min-h-0 flex-col ${className}`}>
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />

      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border px-3.5">
        <div className="flex min-w-0 items-baseline gap-2">
          {index && <span className="mono-label shrink-0 text-tertiary">{index}</span>}
          <span className="mono-label shrink-0 text-secondary">{label}</span>
          {desc && (
            <span className="hidden truncate text-[11px] text-tertiary xl:inline">{desc}</span>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </header>

      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
