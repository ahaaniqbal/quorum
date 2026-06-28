import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Panel from "./Panel";

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
  onSend,
  onEndCall,
  sending,
  callState,
}: {
  conversation: any;
  transcript: any[];
  onStartCall?: () => void;
  onSend?: (text: string) => void;
  onEndCall?: () => void;
  sending?: boolean;
  callState: "idle" | "connecting" | "live" | "ended";
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript.length, sending]);

  function send() {
    const t = draft.trim();
    if (!t || sending) return;
    setDraft("");
    onSend?.(t);
  }
  const qual = conversation?.qualification ?? null;
  const booked = qual?.booked || conversation?.summary?.toLowerCase?.().includes("booked");
  const score = qual?.score ?? 0;

  const statusPill =
    callState === "live" ? (
      <span className="pill bg-good/15 text-good">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" /> On call
      </span>
    ) : callState === "connecting" ? (
      <span className="pill bg-warn/15 text-warn">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warn" /> Connecting
      </span>
    ) : booked ? (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ease: [0.175, 0.885, 0.32, 1.1] }}
        className="pill bg-good/15 text-good"
      >
        ✓ Meeting booked
      </motion.span>
    ) : (
      <span className="mono-label tnum text-tertiary">
        {score ? `score ${score}/100` : "idle"}
      </span>
    );

  return (
    <Panel label="Live Call" index="02" right={statusPill}>
      {/* Scorecard */}
      <div className="grid grid-cols-4 gap-3 border-b border-border px-4 py-3">
        {PILLARS.map((p) => {
          const s = qual?.[p.key]?.score ?? 0;
          return (
            <div key={p.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="mono-label normal-case tracking-normal">{p.label}</span>
                <span className="font-mono text-[12px] tabular-nums text-text">
                  {s ? s : "—"}
                  <span className="text-tertiary">{s ? "/10" : ""}</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-surface2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--accent)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${s * 10}%` }}
                  transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.1] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {transcript.length === 0 && callState !== "live" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="dot-grid flex h-14 w-14 items-center justify-center rounded-full border border-border">
              <span
                className="h-2.5 w-2.5 animate-pulse rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </div>
            <p className="max-w-[230px] text-[13px] leading-relaxed text-secondary">
              {callState === "connecting"
                ? "Quorum is dialing the prospect…"
                : "The voice rep will greet the prospect by name and qualify live."}
            </p>
            {onStartCall && callState === "idle" && (
              <button onClick={onStartCall} className="btn-secondary h-8 text-[12px]">
                Start call manually
              </button>
            )}
          </div>
        )}
        <AnimatePresence initial={false}>
          {transcript.map((line) => (
            <motion.div
              key={line._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.175, 0.885, 0.32, 1.1] }}
              className={`flex ${line.role === "rep" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-[13px] leading-snug ${
                  line.role === "rep"
                    ? "rounded-tl-sm border border-border bg-surface2 text-text"
                    : "rounded-tr-sm text-white"
                }`}
                style={line.role !== "rep" ? { background: "var(--accent)" } : undefined}
              >
                <span className="mono-label mb-1 block opacity-70">
                  {line.role === "rep" ? "Quorum Rep" : "Prospect"}
                </span>
                {line.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-lg rounded-tl-sm border border-border bg-surface2 px-3.5 py-2.5">
              <span className="mono-label">Quorum Rep</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1 w-1 animate-pulse rounded-full bg-secondary"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live conversation input — the prospect actually replies to the AI rep */}
      {callState === "live" && onSend && (
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Reply to the rep as the prospect…"
              className="max-h-24 min-h-[38px] flex-1 resize-none rounded border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none transition-colors duration-150 placeholder:text-tertiary focus:border-border-strong"
            />
            <button onClick={send} disabled={sending || !draft.trim()} className="btn-primary h-[38px] px-3">
              Send
            </button>
            <button onClick={onEndCall} className="btn-secondary h-[38px] px-3" title="End call & qualify">
              End
            </button>
          </div>
        </div>
      )}

      {conversation?.summary && callState === "ended" && (
        <div className="border-t border-border px-4 py-3">
          <p className="mono-label mb-1.5">Summary</p>
          <p className="text-[13px] leading-relaxed text-secondary">{conversation.summary}</p>
        </div>
      )}
    </Panel>
  );
}
