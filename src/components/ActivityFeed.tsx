import { AnimatePresence, motion } from "framer-motion";
import { EVENT_DOT, timeAgo } from "../lib/format";

export default function ActivityFeed({ events }: { events: any[] }) {
  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-secondary">
          Activity
        </h2>
        <span className="chip py-0.5">{events.length} events</span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        <AnimatePresence initial={false}>
          {events.map((ev) => (
            <motion.div
              key={ev._id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex gap-2.5 rounded-lg px-2 py-2 hover:bg-surface2"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  EVENT_DOT[ev.type] ?? "bg-secondary"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-text">{ev.label}</p>
                <p className="mt-0.5 text-[11px] text-secondary">
                  {timeAgo(ev._creationTime)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-secondary">
            Waiting for the account brain to wake up…
          </p>
        )}
      </div>
    </div>
  );
}
