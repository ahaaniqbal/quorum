import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Zap,
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
import { deriveProgress, STAGES } from "../lib/stages";
import { buildClientIntelligence } from "../lib/intelligence";

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
  const mapCommittee = useAction(api.committee.mapCommittee);
  const generateOutreach = useAction(api.outreach.generateOutreach);
  const fireActions = useMutation(api.closeLoop.fireActions);
  const startRethread = useAction(api.rethread.startRethread);

  const [autopilot, setAutopilot] = useState(true);
  const [rethreading, setRethreading] = useState(false);
  const [sending, setSending] = useState(false);
  const runningRef = useRef<string | null>(null);

  // Reset the autopilot guard when navigating between deals.
  useEffect(() => {
    runningRef.current = null;
    setAutopilot(true);
  }, [accountId]);

  const account = data?.account;
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
    if (!action || !account || runningRef.current === action) return;
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

  // Autopilot: auto-advance the pipeline when enabled.
  useEffect(() => {
    if (!autopilot || !nextAction) return;
    if (runningRef.current === nextAction) return;
    const t = setTimeout(() => fire(nextAction), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilot, nextAction, account?._id, primary?._id]);

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

  const onRethread = async () => {
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
      <TopBar account={account} onRethread={onRethread} rethreading={rethreading} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-bg">
        <div className="mx-auto max-w-[1480px] px-3 py-3 sm:px-4 sm:py-4">
          <DealCommandHeader
            account={account}
            intelligence={intelligence}
            reached={reached}
            callLive={callLive}
            done={done}
            autopilot={autopilot}
            nextLabel={nextLabel}
            nextAction={nextAction}
            pendingDrafts={drafts.filter((draft: any) => draft.status === "draft").length}
            actionIssues={actions.filter((action: any) => ["pending", "failed", "skipped"].includes(action.status)).length}
            onToggleAutopilot={() => setAutopilot((current) => !current)}
            onRunNext={() => fire(nextAction)}
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="min-w-0 space-y-4">
              <DecisionPanel
                account={account}
                moves={account!.moves}
                callLive={callLive}
                nextLabel={nextLabel}
                nextAction={nextAction}
                actioned={actioned}
                onRunNext={() => fire(nextAction)}
              />
              <AccountBrainPanel intelligence={intelligence} />
              <CallPanel
                conversation={convo}
                transcript={data.transcript}
                callState={callState}
                sending={sending}
                onStartCall={() => fire("call")}
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
            </div>

            <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
              <DealMap
                contacts={contacts}
                drafts={drafts}
                graph={account!.graph}
                moves={account!.moves}
                onMapCommittee={() => fire("committee")}
                mapping={runningRef.current === "committee" && committeeCount === 0}
              />
              <ActivityFeed events={data.events.slice(0, 8)} />
            </aside>
          </div>

          <div className="mt-4">
            <ActionsRail
              actions={actions}
              onFire={async () => {
                await fire("outreach");
                runningRef.current = null;
                await fire("actions");
              }}
              firing={runningRef.current === "actions" && !actioned}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function DealCommandHeader({
  account,
  intelligence,
  reached,
  callLive,
  done,
  autopilot,
  nextLabel,
  nextAction,
  pendingDrafts,
  actionIssues,
  onToggleAutopilot,
  onRunNext,
}: {
  account: any;
  intelligence: any;
  reached: number;
  callLive: boolean;
  done: boolean;
  autopilot: boolean;
  nextLabel: string | null;
  nextAction: Action | null;
  pendingDrafts: number;
  actionIssues: number;
  onToggleAutopilot: () => void;
  onRunNext: () => void;
}) {
  const score = intelligence?.score ?? 0;
  const decision = getDecisionCopy({
    account,
    callLive,
    done,
    nextLabel,
    pendingDrafts,
    actionIssues,
  });
  const DecisionIcon = decision.icon;
  const activeStageIndex = done ? STAGES.length - 1 : Math.min(STAGES.length - 1, reached + 1);

  return (
    <section className="cell overflow-hidden bg-[#0d0d0c]">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label text-accent-soft">Account command center</span>
            <span className="mono-label text-tertiary">One screen, one decision</span>
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-balance text-[26px] font-semibold leading-tight tracking-tight text-text sm:text-[34px]">
                {done ? `${account.companyName} is fully worked.` : `Quorum is working ${account.companyName}.`}
              </h1>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-secondary sm:text-[14px]">
                Quorum has one job here: understand the account, hold customer-facing decisions for review,
                and close the loop only when the evidence is good enough.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <SignalPill label="Brain confidence" value={`${score}%`} tone={score >= 82 ? "good" : score >= 65 ? "warn" : "risk"} />
              <SignalPill label="Review" value={`${pendingDrafts + actionIssues}`} tone={pendingDrafts + actionIssues ? "warn" : "good"} />
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {STAGES.map((stage, index) => {
              const isDone = done || index <= reached;
              const isActive = !done && index === activeStageIndex;
              return (
                <div
                  key={stage.key}
                  className={`border px-3 py-3 ${
                    isActive
                      ? "border-accent/40 bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]"
                      : isDone
                        ? "border-good/25 bg-transparent"
                        : "border-border bg-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={isDone ? "text-good" : isActive ? "text-accent-soft" : "text-tertiary"}>
                      {isDone ? <Check size={15} strokeWidth={2.2} /> : <CircleDot size={15} strokeWidth={2.2} />}
                    </span>
                    <span className="mono-label tnum text-tertiary">0{index + 1}</span>
                  </div>
                  <p className="mt-3 text-[12px] font-semibold text-text">{stage.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <DecisionIcon size={16} strokeWidth={2.1} className={decision.toneClass} />
            <p className="mono-label">Next human decision</p>
          </div>
          <h2 className="mt-3 text-balance text-[19px] font-semibold leading-tight text-text">
            {decision.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-secondary">{decision.body}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
            {nextAction && !callLive && (
              <button onClick={onRunNext} className="btn-primary h-10 flex-1 px-4">
                Run {nextLabel}
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            )}
            <button onClick={onToggleAutopilot} className="btn-secondary h-10 flex-1 px-4">
              {autopilot ? <Pause size={14} strokeWidth={2.2} /> : <Play size={14} strokeWidth={2.2} />}
              {autopilot ? "Pause autopilot" : "Resume autopilot"}
            </button>
            {(pendingDrafts > 0 || actionIssues > 0) && (
              <Link to="/review" className="btn-secondary h-10 flex-1 px-4">
                Open review gate
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionPanel({
  account,
  moves,
  callLive,
  nextLabel,
  nextAction,
  actioned,
  onRunNext,
}: {
  account: any;
  moves: any;
  callLive: boolean;
  nextLabel: string | null;
  nextAction: Action | null;
  actioned: boolean;
  onRunNext: () => void;
}) {
  const topMove = moves?.top_move;
  const urgency = topMove?.urgency ? String(topMove.urgency).replace(/_/g, " ") : "today";
  return (
    <section className="cell overflow-hidden">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-label text-accent-soft">Recommended move</span>
            <span className="mono-label normal-case tracking-normal text-tertiary">{urgency}</span>
          </div>
          <h2 className="mt-3 text-balance text-[21px] font-semibold leading-tight text-text">
            {topMove?.name ? `${topMove.name}: ` : ""}
            {topMove?.action ?? (actioned ? "Monitor replies and keep integrations healthy." : "Let Quorum continue the account loop.")}
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-secondary">
            This is intentionally the only primary instruction on the page. Everything else is evidence:
            why the recommendation exists, what may block it, and what Quorum will do after approval.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {nextAction && !callLive ? (
              <button onClick={onRunNext} className="btn-primary h-10 px-4">
                {nextLabel ? `Run ${nextLabel}` : "Run next step"}
                <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            ) : (
              <Link to="/review" className="btn-primary h-10 px-4">
                Review customer-facing work
                <ArrowRight size={15} strokeWidth={2.2} />
              </Link>
            )}
            <Link to="/integrations" className="btn-secondary h-10 px-4">
              Connect destinations
            </Link>
          </div>
        </div>

        <div className="border-t border-border p-4 lg:border-l lg:border-t-0">
          <p className="mono-label">What happens next</p>
          <div className="mt-3 space-y-3">
            <FlowRow icon={Bot} label="Quorum works" detail={`Builds the brain for ${account.companyName}.`} />
            <FlowRow icon={ShieldCheck} label="You decide" detail="Drafts and risky actions stop at review." />
            <FlowRow icon={Zap} label="Systems update" detail="Approved work lands in connected destinations." />
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowRow({
  icon: Icon,
  label,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-border text-accent-soft">
        <Icon size={14} strokeWidth={2.1} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-tertiary">{detail}</span>
      </span>
    </div>
  );
}

function SignalPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "risk";
}) {
  const toneClass = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-risk";
  return (
    <div className="flex items-center gap-2 border border-border bg-surface px-3 py-2">
      <span className="mono-label normal-case tracking-normal text-tertiary">{label}</span>
      <span className={`font-mono text-[13px] font-semibold tnum ${toneClass}`}>{value}</span>
    </div>
  );
}

function getDecisionCopy({
  account,
  callLive,
  done,
  nextLabel,
  pendingDrafts,
  actionIssues,
}: {
  account: any;
  callLive: boolean;
  done: boolean;
  nextLabel: string | null;
  pendingDrafts: number;
  actionIssues: number;
}) {
  if (callLive) {
    return {
      icon: Clock3,
      toneClass: "text-warn",
      title: "A live call needs your reply.",
      body: "The rest of the automation is paused until this qualification thread finishes.",
    };
  }
  if (pendingDrafts || actionIssues) {
    return {
      icon: AlertTriangle,
      toneClass: "text-warn",
      title: `${pendingDrafts + actionIssues} item${pendingDrafts + actionIssues === 1 ? "" : "s"} need review.`,
      body: "Approve clean drafts and audit blocked actions before anything customer-facing leaves Quorum.",
    };
  }
  if (nextLabel) {
    return {
      icon: Sparkles,
      toneClass: "text-accent-soft",
      title: `${nextLabel} is the next safe step.`,
      body: `Quorum has enough context to continue working ${account.companyName}; you can run it manually or let autopilot proceed.`,
    };
  }
  if (done) {
    return {
      icon: CheckCircle2,
      toneClass: "text-good",
      title: "The account loop is complete.",
      body: "Watch for replies, keep the destinations connected, and use Review for any new customer-facing work.",
    };
  }
  return {
    icon: CircleDot,
    toneClass: "text-tertiary",
    title: "Quorum is waiting for the next signal.",
    body: "Add inbound context, map the committee, or start a qualification call when you are ready.",
  };
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid flex flex-1 items-center justify-center">
      <p className="mono-label normal-case tracking-normal text-secondary">{children}</p>
    </div>
  );
}
