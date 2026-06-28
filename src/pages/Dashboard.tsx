import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import TopBar from "../components/TopBar";
import Stepper from "../components/Stepper";
import ActivityFeed from "../components/ActivityFeed";
import CallPanel from "../components/CallPanel";
import DealMap from "../components/DealMap";
import ActionsRail from "../components/ActionsRail";
import { deriveProgress } from "../lib/stages";

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
  const actioned =
    account?.status === "actioned" || actions.some((a: any) => a.status === "done");

  // The single next step in the linear pipeline (null = waiting or done).
  let nextAction: Action | null = null;
  if (account) {
    if (!convo) nextAction = "call";
    else if (convo.status === "live") nextAction = null;
    else if (committeeCount === 0) nextAction = "committee";
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
    const delay = nextAction === "call" ? 900 : 1600;
    const t = setTimeout(() => fire(nextAction), delay);
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
    nextAction === "call"
      ? "Qualify"
      : nextAction === "committee"
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
      <Stepper
        reached={reached}
        callLive={callLive}
        autopilot={autopilot}
        done={done}
        nextLabel={nextLabel}
        onToggleAutopilot={() => setAutopilot((a) => !a)}
        onRunNext={() => fire(nextAction)}
      />
      <main className="grid-lines grid min-h-0 flex-1 grid-cols-[330px_1fr_368px] gap-3 overflow-hidden p-3">
        <ActivityFeed events={data.events} />
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
        <DealMap
          contacts={contacts}
          drafts={drafts}
          onMapCommittee={() => fire("committee")}
          mapping={runningRef.current === "committee" && committeeCount === 0}
        />
      </main>
      <div className="px-3 pb-3">
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
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid flex flex-1 items-center justify-center">
      <p className="mono-label normal-case tracking-normal text-secondary">{children}</p>
    </div>
  );
}
