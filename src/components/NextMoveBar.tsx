const STATUS_STYLE: Record<string, string> = {
  advancing: "bg-good/15 text-good",
  healthy: "bg-good/15 text-good",
  at_risk: "bg-warn/15 text-warn",
  stalled: "bg-risk/15 text-risk",
};

const URGENCY_STYLE: Record<string, string> = {
  now: "text-risk",
  today: "text-warn",
  this_week: "text-tertiary",
};

export default function NextMoveBar({ moves }: { moves: any }) {
  if (!moves?.top_move) return null;
  const t = moves.top_move;
  return (
    <div className="flex items-center gap-3 border-b border-border bg-[#0c0c0c] px-5 py-2.5">
      <span className="mono-label shrink-0 text-tertiary">Next move</span>
      <span className={`pill shrink-0 ${STATUS_STYLE[moves.deal_status] ?? "bg-surface2 text-secondary"}`}>
        {(moves.deal_status ?? "").replace(/_/g, " ")}
      </span>
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[13px] text-text">
          <span className="font-medium">{t.name}:</span> {t.action}
        </span>
      </div>
      <span
        className={`mono-label shrink-0 normal-case tracking-normal ${
          URGENCY_STYLE[t.urgency] ?? "text-tertiary"
        }`}
      >
        {(t.urgency ?? "").replace(/_/g, " ")} · {t.channel}
      </span>
    </div>
  );
}
