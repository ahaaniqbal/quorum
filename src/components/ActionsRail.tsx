import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Circle, Clock3, type LucideIcon } from "lucide-react";

const DEFS = [
  { type: "slack", label: "Slack alert" },
  { type: "hubspot", label: "CRM record" },
  { type: "calendar", label: "Calendar invite" },
  { type: "email", label: "Outreach sent" },
];

const STATUS_ICON: Record<string, LucideIcon> = {
  done: Check,
  pending: Clock3,
  skipped: ArrowRight,
};

export default function ActionsRail({
  actions,
  onFire,
  firing,
}: {
  actions: any[];
  onFire: () => void;
  firing: boolean;
}) {
  const byType: Record<string, any> = {};
  for (const a of actions) byType[a.type] = a;
  const needsReview = actions.some((action) =>
    ["pending", "failed", "skipped"].includes(action.status)
  );

  return (
    <div className="cell flex flex-col items-stretch gap-3 px-4 py-3 md:flex-row md:items-center md:py-2.5">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />

      <div className="flex shrink-0 items-center gap-2">
        <span className="mono-label text-tertiary">04</span>
        <span className="mono-label text-secondary">Actions</span>
        <span className="hidden text-[11px] text-tertiary xl:inline">
          Real work, done across your stack.
        </span>
      </div>

      <div className="flex flex-1 flex-wrap gap-1.5">
        {DEFS.map((d) => {
          const a = byType[d.type];
          const status = a?.status ?? "idle";
          // Only show confidence/risk when the action actually carries them.
          const confidence = typeof a?.confidence === "number" ? a.confidence : null;
          const risk = typeof a?.risk === "string" ? a.risk : null;
          const Icon = STATUS_ICON[status] ?? Circle;
          return (
            <motion.div
              key={d.type}
              layout
              transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.1] }}
              className={`pill border font-mono text-[11px] ${
                status === "done"
                  ? "border-good/30 bg-good/10 text-good"
                  : status === "pending"
                    ? "border-warn/30 bg-warn/10 text-warn"
                    : status === "failed"
                      ? "border-risk/30 bg-risk/10 text-risk"
                      : status === "skipped"
                        ? "border-border bg-surface2 text-secondary"
                        : "border-border bg-surface2 text-tertiary"
              }`}
            >
              <Icon size={11} strokeWidth={2.4} className="shrink-0" />
              {a?.system ?? d.label}
              {confidence !== null ? <span className="text-tertiary"> · {confidence}%</span> : null}
              {risk ? <span className="text-tertiary"> · {risk} risk</span> : null}
            </motion.div>
          );
        })}
      </div>

      {needsReview && (
        <Link
          to="/review"
          className="mono-label shrink-0 border border-warn/30 bg-warn/10 px-2 py-1.5 text-center normal-case tracking-normal text-warn transition-colors hover:border-warn/50"
        >
          audit actions →
        </Link>
      )}

      <button onClick={onFire} disabled={firing} className="btn-primary w-full shrink-0 md:w-auto">
        {firing ? "Firing…" : "Close the loop"}
      </button>
    </div>
  );
}
