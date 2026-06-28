import { motion } from "framer-motion";

const DEFS = [
  { type: "slack", label: "Slack alert" },
  { type: "hubspot", label: "CRM record" },
  { type: "calendar", label: "Calendar invite" },
  { type: "email", label: "Outreach sent" },
];

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

  return (
    <div className="cell flex items-center gap-3 px-4 py-2.5">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />

      <div className="flex items-center gap-2">
        <span className="mono-label text-tertiary">04</span>
        <span className="mono-label text-secondary">Actions</span>
      </div>

      <div className="flex flex-1 flex-wrap gap-1.5">
        {DEFS.map((d) => {
          const a = byType[d.type];
          const status = a?.status ?? "idle";
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
              <span className="tabular-nums">
                {status === "done"
                  ? "✓"
                  : status === "pending"
                    ? "•"
                    : status === "skipped"
                      ? "→"
                      : "○"}
              </span>{" "}
              {a?.label ?? d.label}
            </motion.div>
          );
        })}
      </div>

      <button onClick={onFire} disabled={firing} className="btn-primary shrink-0">
        {firing ? "Firing…" : "Close the loop"}
      </button>
    </div>
  );
}
