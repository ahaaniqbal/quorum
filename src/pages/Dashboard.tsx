import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { startRealVapiCall, hasVapiKey } from "../lib/vapi";
import TopBar from "../components/TopBar";
import ActivityFeed from "../components/ActivityFeed";
import CallPanel from "../components/CallPanel";
import DealMap from "../components/DealMap";
import ActionsRail from "../components/ActionsRail";

export default function Dashboard() {
  const { accountId } = useParams<{ accountId: string }>();
  const data = useQuery(
    api.queries.getAccountFull,
    accountId ? { accountId: accountId as Id<"accounts"> } : "skip"
  );

  const startSimulatedCall = useMutation(api.voice.startSimulatedCall);
  const createVoiceConversation = useMutation(api.voice.createVoiceConversation);
  const appendRealLine = useMutation(api.voice.appendRealLine);
  const mapCommittee = useMutation(api.committee.mapCommittee);
  const generateOutreach = useAction(api.outreach.generateOutreach);
  const fireActions = useMutation(api.closeLoop.fireActions);
  const startRethread = useMutation(api.rethread.startRethread);

  const [callState, setCallState] = useState<"idle" | "connecting" | "live" | "ended">(
    "idle"
  );
  const [mapping, setMapping] = useState(false);
  const [firing, setFiring] = useState(false);
  const [rethreading, setRethreading] = useState(false);

  // Derive call state from the live conversation so it survives reloads.
  const convoStatus = data?.latestConversation?.status;
  useEffect(() => {
    if (convoStatus === "live") setCallState("live");
    else if (convoStatus === "ended") setCallState("ended");
  }, [convoStatus]);

  if (!accountId) return <Centered>Missing account.</Centered>;
  if (data === undefined) return <Centered>Loading account brain…</Centered>;
  if (data === null) return <Centered>Account not found.</Centered>;

  const { account, contacts, latestConversation, transcript, events, actions, drafts } =
    data;
  const primary = contacts.find((c: any) => c.isPrimary) ?? contacts[0];

  const onStartCall = async () => {
    if (!primary) return;
    setCallState("connecting");
    try {
      if (hasVapiKey()) {
        // Real Vapi web call: stream live transcript into Convex.
        const conversationId = await createVoiceConversation({ contactId: primary._id });
        await startRealVapiCall({
          contactId: primary._id,
          conversationId,
          onTranscript: (role, text) =>
            appendRealLine({ conversationId, role, text }),
          onEnd: () => setCallState("ended"),
        });
        setCallState("live");
      } else {
        // Simulated server-streamed call (reliable demo path).
        await startSimulatedCall({ contactId: primary._id });
        setCallState("live");
      }
    } catch (e) {
      console.error("[Quorum] call failed", e);
      setCallState("idle");
    }
  };

  const onMapCommittee = async () => {
    setMapping(true);
    try {
      await mapCommittee({ accountId: account._id });
    } catch (e) {
      console.error("[Quorum] map committee failed", e);
    } finally {
      // Leave a moment for the staggered cards to land.
      setTimeout(() => setMapping(false), 3500);
    }
  };

  const onFire = async () => {
    setFiring(true);
    try {
      // Draft persona outreach and fire the cross-tool action loop together.
      await Promise.all([
        generateOutreach({ accountId: account._id }),
        fireActions({ accountId: account._id }),
      ]);
    } catch (e) {
      console.error("[Quorum] close loop failed", e);
    } finally {
      setTimeout(() => setFiring(false), 3500);
    }
  };

  const onRethread = async () => {
    setRethreading(true);
    try {
      await startRethread({ accountId: account._id });
    } catch (e) {
      console.error("[Quorum] rethread failed", e);
    } finally {
      setTimeout(() => setRethreading(false), 12000);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-bg">
      <TopBar account={account} onRethread={onRethread} rethreading={rethreading} />
      <main className="grid flex-1 grid-cols-[320px_1fr_360px] gap-3 overflow-hidden p-3">
        <ActivityFeed events={events} />
        <CallPanel
          conversation={latestConversation}
          transcript={transcript}
          onStartCall={onStartCall}
          callState={callState}
        />
        <DealMap
          contacts={contacts}
          drafts={drafts}
          onMapCommittee={onMapCommittee}
          mapping={mapping}
        />
      </main>
      <div className="px-3 pb-3">
        <ActionsRail actions={actions} onFire={onFire} firing={firing} />
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <p className="text-sm text-secondary">{children}</p>
    </div>
  );
}
