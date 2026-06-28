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
    <div className="card flex items-center gap-3 px-4 py-3">
      <span className="text-[13px] font-semibold uppercase tracking-wide text-secondary">
        Actions
      </span>
      <div className="flex flex-1 flex-wrap gap-2">
        {DEFS.map((d) => {
          const a = byType[d.type];
          const status = a?.status ?? "idle";
          return (
            <motion.div
              key={d.type}
              layout
              className={`pill border ${
                status === "done"
                  ? "border-good/30 bg-good/15 text-good"
                  : status === "pending"
                    ? "border-warn/30 bg-warn/15 text-warn"
                    : status === "failed"
                      ? "border-risk/30 bg-risk/15 text-risk"
                      : "border-border bg-surface2 text-secondary"
              }`}
            >
              {status === "done" ? "✓" : status === "pending" ? "•" : "○"}{" "}
              {a?.label ?? d.label}
            </motion.div>
          );
        })}
      </div>
      <button onClick={onFire} disabled={firing} className="btn-primary">
        {firing ? "Firing…" : "Close the loop"}
      </button>
    </div>
  );
}
