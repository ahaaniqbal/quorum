import { AnimatePresence, motion } from "framer-motion";

const PILLARS = [
  { key: "budget", label: "Budget" },
  { key: "authority", label: "Authority" },
  { key: "need", label: "Need" },
  { key: "timing", label: "Timing" },
];

export default function CallPanel({
  conversation,
  transcript,
  onStartCall,
  callState,
}: {
  conversation: any;
  transcript: any[];
  onStartCall: () => void;
  callState: "idle" | "connecting" | "live" | "ended";
}) {
  const qual = conversation?.qualification ?? null;
  const booked = qual?.booked || conversation?.summary?.toLowerCase?.().includes("booked");

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-secondary">
            Live Call
          </h2>
          {callState === "live" && (
            <span className="pill bg-good/15 text-good">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" /> On call
            </span>
          )}
          {callState === "connecting" && (
            <span className="pill bg-warn/15 text-warn">Connecting…</span>
          )}
        </div>
        {booked && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="pill bg-good/15 text-good"
          >
            ✓ Meeting booked
          </motion.span>
        )}
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-4 gap-2 border-b border-border px-4 py-3">
        {PILLARS.map((p) => {
          const score = qual?.[p.key]?.score ?? 0;
          return (
            <div key={p.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-secondary">{p.label}</span>
                <span className="text-[11px] font-semibold text-text">
                  {score ? `${score}` : "—"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${score * 10}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transcript */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {transcript.length === 0 && callState === "idle" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-[220px] text-sm text-secondary">
              Start the voice rep. It greets the prospect by name and qualifies live.
            </p>
            <button onClick={onStartCall} className="btn-primary">
              <span className="h-2 w-2 rounded-full bg-white" /> Start voice call
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {transcript.map((line) => (
            <motion.div
              key={line._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${line.role === "rep" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug ${
                  line.role === "rep"
                    ? "rounded-tl-sm bg-surface2 text-text"
                    : "rounded-tr-sm bg-accent/90 text-white"
                }`}
              >
                <span className="mb-0.5 block text-[10px] uppercase tracking-wide opacity-60">
                  {line.role === "rep" ? "Quorum Rep" : "Prospect"}
                </span>
                {line.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {conversation?.summary && callState !== "idle" && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-secondary">Summary</p>
          <p className="mt-1 text-[13px] text-text">{conversation.summary}</p>
        </div>
      )}
    </div>
  );
}
