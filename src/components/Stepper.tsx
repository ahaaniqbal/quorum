import { motion } from "framer-motion";
import { STAGES } from "../lib/stages";

export default function Stepper({
  reached,
  callLive,
  autopilot,
  done,
  nextLabel,
  onToggleAutopilot,
  onRunNext,
}: {
  reached: number;
  callLive: boolean;
  autopilot: boolean;
  done: boolean;
  nextLabel: string | null;
  onToggleAutopilot: () => void;
  onRunNext: () => void;
}) {
  // The "active" stage is the one currently being worked (reached + 1), or the
  // call stage while the call is live.
  const activeIdx = callLive ? 1 : done ? -1 : reached + 1;

  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const isDone = i <= reached && !(callLive && i === 1);
          const isActive = i === activeIdx;
          return (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <span className="relative flex h-4 w-4 items-center justify-center">
                  {isActive && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--accent) 30%, transparent)" }}
                      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                  <span
                    className={`relative flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                      isDone
                        ? "border-accent bg-accent text-white"
                        : isActive
                          ? "border-accent text-accent"
                          : "border-border text-tertiary"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                </span>
                <span
                  className={`mono-label normal-case tracking-normal ${
                    isDone || isActive ? "text-text" : "text-tertiary"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`mx-2.5 h-px w-7 ${i < reached ? "bg-accent/50" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Autopilot controls */}
      <div className="flex items-center gap-2">
        {!done && (
          <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                autopilot ? "animate-pulse bg-accent" : "bg-tertiary"
              }`}
            />
            <span className="mono-label normal-case tracking-normal text-secondary">
              {autopilot ? (callLive ? "autopilot · on call" : "autopilot running") : "paused"}
            </span>
          </div>
        )}
        {done ? (
          <span className="pill bg-good/10 text-good">✓ Account worked</span>
        ) : autopilot ? (
          <button onClick={onToggleAutopilot} className="btn-secondary h-7 px-3 text-[12px]">
            Pause
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRunNext}
              disabled={callLive || !nextLabel}
              className="btn-primary h-7 px-3 text-[12px]"
            >
              {nextLabel ? `Run: ${nextLabel} →` : "Waiting…"}
            </button>
            <button onClick={onToggleAutopilot} className="btn-secondary h-7 px-3 text-[12px]">
              Resume
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
