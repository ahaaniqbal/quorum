import { AlertTriangle, Check, FileSearch, ShieldCheck } from "lucide-react";
import Panel from "./Panel";

const SEVERITY: Record<string, string> = {
  high: "text-risk",
  medium: "text-warn",
  low: "text-tertiary",
};

const SOURCE_STYLE: Record<string, string> = {
  verified: "border-good/25 text-good",
  inferred: "border-accent/25 text-accent-soft",
  missing: "border-risk/25 text-risk",
  blocked: "border-warn/25 text-warn",
};

export default function AccountBrainPanel({ intelligence }: { intelligence: any }) {
  if (!intelligence) return null;
  const score = intelligence.score ?? 0;
  const scoreTone = score >= 82 ? "text-good" : score >= 65 ? "text-warn" : "text-risk";
  const primaryGaps = intelligence.gaps ?? [];
  const sources = intelligence.sources ?? [];

  return (
    <Panel
      label="Account brain"
      index="02"
      desc="Sources, confidence, gaps, and action risk."
      className="min-h-[218px]"
      right={<span className={`mono-label tnum ${scoreTone}`}>{score}% · {intelligence.grade}</span>}
    >
      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[220px_1fr]">
        <div className="border-b border-border p-3.5 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-accent-subtle text-accent-soft">
              <ShieldCheck size={21} strokeWidth={2.1} />
            </div>
            <div>
              <p className="mono-label">Confidence</p>
              <p className={`mt-1 text-[24px] font-semibold leading-none tnum ${scoreTone}`}>{score}%</p>
            </div>
          </div>
          <div className="mt-4 h-1.5 border border-border bg-bg">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${Math.max(4, Math.min(100, score))}%` }}
            />
          </div>
          <div className="mt-4 space-y-1.5">
            {(intelligence.checklist ?? []).map((item: any) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-secondary">{item.label}</span>
                <span className={item.done ? "text-good" : "text-tertiary"}>{item.done ? "ready" : "open"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 gap-0 md:grid-cols-2">
          <div className="border-b border-border p-3.5 md:border-b-0 md:border-r">
            <div className="mb-2 flex items-center gap-2">
              <FileSearch size={14} strokeWidth={2.1} className="text-accent-soft" />
              <p className="mono-label">Evidence</p>
            </div>
            <div className="space-y-1.5">
              {sources.slice(0, 4).map((source: any) => (
                <div key={`${source.label}:${source.detail}`} className="border border-border bg-transparent px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium text-text">{source.label}</p>
                    <span className={`mono-label tnum ${SOURCE_STYLE[source.status] ?? "text-tertiary"}`}>
                      {source.confidence}%
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-tertiary">{source.detail || source.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5">
            <div className="mb-2 flex items-center gap-2">
              {primaryGaps.length ? (
                <AlertTriangle size={14} strokeWidth={2.1} className="text-warn" />
              ) : (
                <Check size={14} strokeWidth={2.1} className="text-good" />
              )}
              <p className="mono-label">Gaps to close</p>
            </div>
            <div className="space-y-1.5">
              {primaryGaps.length ? (
                primaryGaps.slice(0, 4).map((gap: any) => (
                  <div key={gap.label} className="border border-border bg-transparent px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-medium text-text">{gap.label}</p>
                      <span className={`mono-label ${SEVERITY[gap.severity] ?? "text-tertiary"}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-tertiary">{gap.detail}</p>
                  </div>
                ))
              ) : (
                <div className="border border-good/20 bg-transparent px-2.5 py-2">
                  <p className="text-[12px] font-medium text-good">No major gaps flagged.</p>
                  <p className="mt-1 text-[11px] text-tertiary">Keep review gates on for new destinations.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
