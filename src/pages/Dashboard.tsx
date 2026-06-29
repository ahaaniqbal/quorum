import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Pause,
  Play,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import TopBar from "../components/TopBar";
import ActivityFeed from "../components/ActivityFeed";
import CallPanel from "../components/CallPanel";
import DealMap from "../components/DealMap";
import ActionsRail from "../components/ActionsRail";
import AccountBrainPanel from "../components/AccountBrainPanel";
import AgentReceiptsPanel from "../components/AgentReceiptsPanel";
import { deriveProgress, STAGES } from "../lib/stages";
import { buildClientIntelligence } from "../lib/intelligence";
import { hasVapiKey, startRealVapiCall, stopActiveVapiCall } from "../lib/vapi";

type Action = "call" | "committee" | "outreach" | "actions";

export default function Dashboard() {
  const { accountId } = useParams<{ accountId: string }>();
  const data = useQuery(
    api.queries.getAccountFull,
    accountId ? { accountId: accountId as Id<"accounts"> } : "skip"
  );

  const startCall = useAction(api.voice.startCall);
  const replyToCall = useAction(api.voice.replyToCall);
  const endCall = useAction(api.voice.endCall);
  const createVoiceConversation = useMutation(api.voice.createVoiceConversation);
  const appendRealLine = useMutation(api.voice.appendRealLine);
  const mapCommittee = useAction(api.committee.mapCommittee);
  const generateOutreach = useAction(api.outreach.generateOutreach);
  const fireActions = useMutation(api.closeLoop.fireActions);
  const startRethread = useAction(api.rethread.startRethread);

  const [autopilot, setAutopilot] = useState(true);
  const [rethreading, setRethreading] = useState(false);
  const [sending, setSending] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const runningRef = useRef<string | null>(null);

  // Reset the autopilot guard when navigating between deals; tear down any live
  // voice call so it never leaks across accounts.
  useEffect(() => {
    runningRef.current = null;
    setAutopilot(true);
    return () => {
      stopActiveVapiCall();
      setVoiceMode(false);
    };
  }, [accountId]);

  const account = data?.account;
  // Demo/sample accounts (no userId) are read-only: fully viewable, but the
  // autopilot and write actions are disabled so a visitor can't mutate the
  // shared showcase. A signed-in/guest user's own worked accounts are writable.
  const readOnly = !!account && !account.userId;
  const contacts = data?.contacts ?? [];
  const primary = contacts.find((c: any) => c.isPrimary) ?? contacts[0];
  const committeeCount = contacts.filter((c: any) => !c.isPrimary).length;
  const convo = data?.latestConversation;
  const drafts = data?.drafts ?? [];
  const actions = data?.actions ?? [];
  const intelligence = data ? data.intelligence ?? buildClientIntelligence(data) : null;
  const actioned =
    account?.status === "actioned" || actions.some((a: any) => a.status === "done");

  // The autopilot spine: runs with zero voice involved. The live call is a
  // separate, optional action the judge can trigger from the Call panel.
  let nextAction: Action | null = null;
  if (account) {
    if (committeeCount === 0) nextAction = "committee";
    else if (drafts.length === 0) nextAction = "outreach";
    else if (!actioned) nextAction = "actions";
  }

  const { reached, callLive, done } = deriveProgress(data ?? null);

  async function fire(action: Action | null) {
    if (!action || !account || readOnly || runningRef.current === action) return;
    runningRef.current = action;
    try {
      if (action === "call" && primary)
        await startCall({ contactId: primary._id });
      else if (action === "committee") await mapCommittee({ accountId: account._id });
      else if (action === "outreach") await generateOutreach({ accountId: account._id });
      else if (action === "actions") await fireActions({ accountId: account._id });
    } catch (e) {
      console.error("[Quorum] autopilot step failed", e);
      runningRef.current = null;
    }
  }

  // The qualification call. When a Vapi public key is configured this is a real
  // in-browser voice call (mic → assistant); otherwise it falls back to the
  // OpenAI text-driven rep. Either way the transcript and scorecard stream live.
  async function startTheCall() {
    if (!primary || !account || readOnly || runningRef.current === "call") return;
    runningRef.current = "call";
    try {
      if (hasVapiKey()) {
        const conversationId = await createVoiceConversation({ contactId: primary._id });
        setVoiceMode(true);
        await startRealVapiCall({
          contactId: primary._id,
          conversationId,
          onTranscript: (role, text) =>
            appendRealLine({ conversationId, role, text }).catch(() => {}),
          onLive: () => {
            runningRef.current = null;
          },
          onEnd: () => {
            setVoiceMode(false);
            runningRef.current = null;
          },
          onError: (m) => console.error("[Quorum] voice call error", m),
        });
      } else {
        await startCall({ contactId: primary._id });
        runningRef.current = null;
      }
    } catch (e) {
      console.error("[Quorum] call failed", e);
      setVoiceMode(false);
      runningRef.current = null;
    }
  }

  // Autopilot: auto-advance the pipeline when enabled (never on a read-only sample).
  useEffect(() => {
    if (!autopilot || !nextAction || readOnly) return;
    if (runningRef.current === nextAction) return;
    const t = setTimeout(() => fire(nextAction), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilot, nextAction, account?._id, primary?._id, readOnly]);

  if (!accountId) return <Centered>Missing account.</Centered>;
  if (data === undefined) return <Centered>Loading account brain…</Centered>;
  if (data === null) return <Centered>Account not found.</Centered>;

  const callState: "idle" | "connecting" | "live" | "ended" = !convo
    ? runningRef.current === "call"
      ? "connecting"
      : "idle"
    : convo.status === "live"
      ? "live"
      : "ended";

  const nextLabel =
    nextAction === "committee"
      ? "Map committee"
      : nextAction === "outreach"
        ? "Draft outreach"
        : nextAction === "actions"
          ? "Close loop"
          : null;

  const pendingDrafts = drafts.filter((d: any) => d.status === "draft").length;
  const actionIssues = actions.filter((a: any) =>
    ["pending", "failed", "skipped"].includes(a.status)
  ).length;
  const pendingReview = pendingDrafts + actionIssues;
  const score = intelligence?.score ?? 0;

  const onRethread = async () => {
    if (readOnly) return;
    setRethreading(true);
    try {
      await startRethread({ accountId: account!._id });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRethreading(false), 12000);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="h-[2px] w-full" style={{ background: "var(--brand)" }} />
      <TopBar account={account} onRethread={readOnly ? undefined : onRethread} rethreading={rethreading} />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1480px] space-y-4 px-3 py-3 sm:px-4 sm:py-4">
          {readOnly && (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-warn/30 bg-warn/[0.06] px-4 py-3">
              <p className="text-[13px] text-secondary">
                <span className="mono-label mr-2 text-warn">Sample account · read-only</span>
                This is a shared demo account, so actions are disabled. Work your own
                company to run the full autonomous loop.
              </p>
              <Link to="/pipeline" className="btn-secondary h-8 shrink-0 px-3 text-[12px]">
                Work your own company →
              </Link>
            </div>
          )}
          {/* ZONE A — State: what happened, at a glance */}
          <Masthead
            account={account}
            score={score}
            grade={intelligence?.grade}
            reached={reached}
            done={done}
            callLive={callLive}
            pendingReview={pendingReview}
            committeeCount={contacts.length}
          />

          {/* ZONE B — Decision: the one move + your call */}
          <DecisionHero
            account={account}
            moves={account!.moves}
            callLive={callLive}
            done={done}
            autopilot={autopilot}
            nextAction={nextAction}
            nextLabel={nextLabel}
            pendingReview={pendingReview}
            readOnly={readOnly}
            onRunNext={() => fire(nextAction)}
            onToggleAutopilot={() => setAutopilot((c) => !c)}
          />

          <AgentReceiptsPanel
            agentRuns={data.agentRuns ?? []}
            events={data.events ?? []}
            actions={actions}
            drafts={drafts}
            account={account}
          />

          {/* ZONE C — Evidence: the dossier behind the recommendation.
              The committee relationship map is the signature artifact of the deal
              brain, so it leads full-width; the brain + activity sit below it. */}
          <DealMap
            contacts={contacts}
            drafts={drafts}
            graph={account!.graph}
            moves={account!.moves}
            onMapCommittee={readOnly ? undefined : () => fire("committee")}
            mapping={runningRef.current === "committee" && committeeCount === 0}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <AccountBrainPanel intelligence={intelligence} />
            <ActivityFeed events={data.events.slice(0, 7)} />
          </div>

          <CallPanel
            conversation={convo}
            transcript={data.transcript}
            callState={callState}
            sending={sending}
            voiceMode={voiceMode}
            onStartCall={readOnly ? undefined : startTheCall}
            onSend={async (text: string) => {
              if (!convo) return;
              setSending(true);
              try {
                await replyToCall({ conversationId: convo._id, text });
              } finally {
                setSending(false);
              }
            }}
            onEndCall={async () => {
              if (convo) await endCall({ conversationId: convo._id });
            }}
          />

          <ActionsRail
            actions={actions}
            onFire={
              readOnly
                ? undefined
                : async () => {
                    await fire("outreach");
                    runningRef.current = null;
                    await fire("actions");
                  }
            }
            firing={runningRef.current === "actions" && !actioned}
          />
        </div>
      </main>
    </div>
  );
}

// ── Zone A: Masthead ─────────────────────────────────────────────────────────
// One compact strip: account state line + inline stage rail + key metrics.
// Replaces the old oversized headline + explainer paragraph + 4 boxed cards.

function Masthead({
  account,
  score,
  grade,
  reached,
  done,
  callLive,
  pendingReview,
  committeeCount,
}: {
  account: any;
  score: number;
  grade?: string;
  reached: number;
  done: boolean;
  callLive: boolean;
  pendingReview: number;
  committeeCount: number;
}) {
  const stateLine = callLive
    ? "Live qualification call in progress"
    : done
      ? "Fully worked. Holding for your review."
      : "Working the account autonomously.";
  const scoreTone = score >= 82 ? "good" : score >= 65 ? "warn" : "risk";

  return (
    <section className="cell overflow-hidden bg-[#0d0d0c]">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono-label text-accent-soft">Account command center</span>
          </div>
          <h1 className="mt-2 text-balance text-[22px] font-semibold leading-tight tracking-tight text-text sm:text-[26px]">
            {account.companyName}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-secondary">
            <span
              className={`h-1.5 w-1.5 shrink-0 ${
                callLive ? "animate-pulse bg-warn" : done ? "bg-good" : "bg-accent"
              }`}
            />
            {stateLine}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-stretch gap-2">
          <Metric label="Brain confidence" value={`${score}%`} sub={grade} tone={scoreTone} bar={score} />
          <Metric
            label="Needs review"
            value={String(pendingReview)}
            sub={pendingReview ? "to approve" : "all clear"}
            tone={pendingReview ? "warn" : "good"}
          />
          <Metric label="Committee" value={String(committeeCount)} sub="stakeholders" tone="neutral" />
        </div>
      </div>

      <StageRail reached={reached} done={done} />
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "warn" | "risk" | "neutral";
  bar?: number;
}) {
  const toneClass =
    tone === "good"
      ? "text-good"
      : tone === "warn"
        ? "text-warn"
        : tone === "risk"
          ? "text-risk"
          : "text-text";
  return (
    <div className="min-w-[124px] border border-border bg-surface px-3 py-2.5">
      <p className="mono-label normal-case tracking-normal text-tertiary">{label}</p>
      <p className={`mt-1 font-mono text-[20px] font-semibold leading-none tnum ${toneClass}`}>
        {value}
      </p>
      {bar !== undefined ? (
        <div className="mt-2 h-1 border border-border bg-bg">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${Math.max(4, Math.min(100, bar))}%` }}
          />
        </div>
      ) : sub ? (
        <p className="mono-label mt-1.5 normal-case tracking-normal text-tertiary">{sub}</p>
      ) : null}
    </div>
  );
}

// The 4-step spine as a thin inline rail (not four boxed cards).
function StageRail({ reached, done }: { reached: number; done: boolean }) {
  const fill = done ? 100 : (Math.min(reached, STAGES.length - 1) / (STAGES.length - 1)) * 100;
  return (
    <div className="border-t border-border px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((stage, i) => {
          const isDone = done || i <= reached;
          const isActive = !done && i === Math.min(STAGES.length - 1, reached + 1);
          return (
            <div key={stage.key} className="flex min-w-0 items-center gap-1.5">
              <span
                className={
                  isDone ? "text-good" : isActive ? "text-accent" : "text-tertiary"
                }
              >
                {isDone ? (
                  <Check size={13} strokeWidth={2.4} />
                ) : (
                  <CircleDot size={13} strokeWidth={2.2} />
                )}
              </span>
              <span
                className={`mono-label normal-case tracking-normal ${
                  isDone ? "text-secondary" : isActive ? "text-accent-soft" : "text-tertiary"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 h-[2px] w-full bg-border">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${Math.max(6, fill)}%` }}
        />
      </div>
    </div>
  );
}

// ── Zone B: Decision hero ────────────────────────────────────────────────────
// One block, two roles. Left: the recommended move (strategy — who & what).
// Right: your call (the immediate gate — approve / run / reply), one primary CTA.

function DecisionHero({
  account,
  moves,
  callLive,
  done,
  autopilot,
  nextAction,
  nextLabel,
  pendingReview,
  readOnly,
  onRunNext,
  onToggleAutopilot,
}: {
  account: any;
  moves: any;
  callLive: boolean;
  done: boolean;
  autopilot: boolean;
  nextAction: Action | null;
  nextLabel: string | null;
  pendingReview: number;
  readOnly?: boolean;
  onRunNext: () => void;
  onToggleAutopilot: () => void;
}) {
  const topMove = moves?.top_move;
  const urgency = topMove?.urgency ? String(topMove.urgency).replace(/_/g, " ") : "today";
  const moveText =
    topMove?.action ??
    (done ? "Monitor replies and keep destinations healthy." : "Let Quorum keep working the account loop.");
  const decision = getDecision({ account, callLive, done, nextLabel, pendingReview });
  const DecisionIcon = decision.icon;

  return (
    <section className="cell overflow-hidden">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_372px]">
        {/* The recommended move — the page's single strategic instruction */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label text-accent-soft">Recommended move</span>
            <span className="mono-label normal-case tracking-normal text-tertiary">· {urgency}</span>
            {topMove?.channel && (
              <span className="mono-label normal-case tracking-normal text-tertiary">
                · {topMove.channel}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-pretty text-[22px] font-semibold leading-snug tracking-tight text-text sm:text-[26px]">
            {topMove?.name ? <span className="text-accent-soft">{topMove.name}.</span> : null}{" "}
            {moveText}
          </h2>
          {topMove?.rationale && (
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-secondary">
              {topMove.rationale}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link to="/review" className="btn-secondary h-9 px-3.5 text-[12px]">
              See drafted outreach
            </Link>
            <Link to="/integrations" className="btn-secondary h-9 px-3.5 text-[12px]">
              Connect destinations
            </Link>
          </div>
        </div>

        {/* Your call — the immediate gate, one primary action */}
        <div className="border-t border-border bg-[#0c0c0b] p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <DecisionIcon size={15} strokeWidth={2.2} className={decision.toneClass} />
            <p className="mono-label">Your call</p>
          </div>
          <h3 className="mt-3 text-balance text-[18px] font-semibold leading-tight text-text">
            {decision.title}
          </h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-secondary">{decision.body}</p>

          <div className="mt-5 space-y-2">
            {readOnly ? (
              <Link to="/pipeline" className="btn-primary h-10 w-full px-4">
                Work your own company
                <ArrowRight size={15} strokeWidth={2.2} />
              </Link>
            ) : (
              <>
                {decision.primary?.to ? (
                  <Link to={decision.primary.to} className="btn-primary h-10 w-full px-4">
                    {decision.primary.label}
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </Link>
                ) : nextAction && !callLive ? (
                  <button onClick={onRunNext} className="btn-primary h-10 w-full px-4">
                    Run {nextLabel}
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </button>
                ) : null}
                <button onClick={onToggleAutopilot} className="btn-secondary h-10 w-full px-4">
                  {autopilot ? <Pause size={14} strokeWidth={2.2} /> : <Play size={14} strokeWidth={2.2} />}
                  {autopilot ? "Pause autopilot" : "Resume autopilot"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function getDecision({
  account,
  callLive,
  done,
  nextLabel,
  pendingReview,
}: {
  account: any;
  callLive: boolean;
  done: boolean;
  nextLabel: string | null;
  pendingReview: number;
}): {
  icon: LucideIcon;
  toneClass: string;
  title: string;
  body: string;
  primary?: { label: string; to: string };
} {
  if (callLive) {
    return {
      icon: Clock3,
      toneClass: "text-warn",
      title: "A live call needs your reply.",
      body: "Autopilot is paused until this qualification thread wraps. Reply in the call panel below.",
    };
  }
  if (pendingReview > 0) {
    return {
      icon: AlertTriangle,
      toneClass: "text-warn",
      title: `${pendingReview} item${pendingReview === 1 ? "" : "s"} need your review.`,
      body: "Nothing customer-facing leaves Quorum until you approve it. Clear the queue to close the loop.",
      primary: { label: "Open review gate", to: "/review" },
    };
  }
  if (nextLabel) {
    return {
      icon: Sparkles,
      toneClass: "text-accent-soft",
      title: `${nextLabel} is the next safe step.`,
      body: `Quorum has enough context to keep working ${account.companyName}. Run it now or let autopilot continue.`,
    };
  }
  if (done) {
    return {
      icon: CheckCircle2,
      toneClass: "text-good",
      title: "Loop complete. Nothing to approve.",
      body: "Watch for replies and keep destinations connected. New customer-facing work will surface here.",
      primary: { label: "Review sent work", to: "/review" },
    };
  }
  return {
    icon: CircleDot,
    toneClass: "text-tertiary",
    title: "Waiting for the next signal.",
    body: "Map the committee or start a qualification call when you are ready.",
  };
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid flex flex-1 items-center justify-center">
      <p className="mono-label normal-case tracking-normal text-secondary">{children}</p>
    </div>
  );
}
