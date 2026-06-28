import { AnimatePresence, motion } from "framer-motion";
import { EVENT_DOT, timeAgo } from "../lib/format";
import Panel from "./Panel";

export default function ActivityFeed({ events }: { events: any[] }) {
  return (
    <Panel
      label="Activity"
      index="01"
      right={
        <span className="mono-label tnum text-tertiary">
          {String(events.length).padStart(2, "0")} events
        </span>
      }
    >
      <div className="flex-1 space-y-0.5 overflow-y-auto p-1.5">
        <AnimatePresence initial={false}>
          {events.map((ev, i) => (
            <motion.div
              key={ev._id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, ease: [0.175, 0.885, 0.32, 1.1] }}
              className="group relative flex gap-2.5 rounded px-2.5 py-2 transition-colors duration-150 hover:bg-surface2"
            >
              <span className="relative mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${EVENT_DOT[ev.type] ?? "bg-tertiary"} ${
                    i === 0 ? "animate-pulse-soft" : ""
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-text">{ev.label}</p>
                <p className="mono-label mt-1 normal-case tracking-normal text-tertiary">
                  {timeAgo(ev._creationTime)}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {events.length === 0 && (
          <p className="px-3 py-8 text-center text-[13px] text-tertiary">
            Waiting for the account brain to wake up…
          </p>
        )}
      </div>
    </Panel>
  );
}
