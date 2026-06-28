import { FormEvent, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  Bot,
  Check,
  ChevronRight,
  CornerDownLeft,
  PanelRightClose,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { STAGES, deriveProgress } from "../lib/stages";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
  markers?: string[];
  actions?: { label: string; to: string }[];
};

const STARTERS = [
  "What should I do next?",
  "Why is this account at risk?",
  "Who is missing from the committee?",
  "Summarize this pipeline.",
];

export default function AskQuorum({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const location = useLocation();
  const accountId = useMemo(() => {
    const match = location.pathname.match(/^\/deal\/([^/]+)/);
    return match?.[1] as Id<"accounts"> | undefined;
  }, [location.pathname]);

  const deal = useQuery(
    api.queries.getAccountFull,
    accountId ? { accountId } : "skip"
  );
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const review = useQuery(api.queries.listReviewQueue, {});
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      body: "Ask me about pipeline risk, next moves, committee gaps, drafts, or customer setup. I’ll answer from Quorum’s live account brain.",
      markers: ["ready", "account brain"],
    },
  ]);

  function ask(text: string) {
    const question = text.trim();
    if (!question) return;
    const response = answerQuestion(question, {
      deal: deal && deal !== null ? deal : null,
      pipeline,
      review,
      accountId,
    });
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", body: question },
      { id: crypto.randomUUID(), role: "assistant", ...response },
    ]);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <aside
      className={`fixed bottom-0 right-0 top-0 z-50 flex w-[390px] max-w-[calc(100vw-20px)] flex-col border-l border-border bg-[#0b0b0a] shadow-[0_0_40px_rgba(0,0,0,0.38)] transition-transform duration-200 ease-vercel ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <header className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center border border-accent/30 bg-accent/15 text-accent-soft">
            <Sparkles size={14} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-text">Ask Quorum</p>
            <p className="mono-label truncate normal-case tracking-normal text-tertiary">
              {deal?.account?.companyName
                ? `${deal.account.companyName} context`
                : "workspace context"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center border border-border text-tertiary transition-colors hover:border-border-strong hover:bg-surface hover:text-text"
          aria-label="Close Ask Quorum"
        >
          <PanelRightClose size={15} strokeWidth={1.9} />
        </button>
      </header>

      <div className="border-b border-border px-3 py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {STARTERS.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => ask(starter)}
              className="border border-border bg-surface/50 px-2 py-2 text-left text-[11px] leading-snug text-secondary transition-colors hover:border-border-strong hover:bg-surface hover:text-text"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>

      <form onSubmit={submit} className="border-t border-border p-3">
        <div className="border border-border bg-surface/50 p-2 focus-within:border-border-strong">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(draft);
              }
            }}
            rows={2}
            placeholder="Ask about this account, queue, or next move..."
            className="max-h-28 min-h-12 w-full resize-none bg-transparent text-[13px] leading-relaxed text-text placeholder:text-tertiary focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="mono-label normal-case tracking-normal text-tertiary">
              <CornerDownLeft size={11} className="mr-1 inline" />
              enter to ask
            </span>
            <button
              type="submit"
              className="flex h-8 items-center gap-1.5 border border-accent/40 bg-accent px-3 text-[12px] font-medium text-white transition-colors hover:brightness-110"
            >
              Ask <Send size={12} strokeWidth={2} />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] border p-3 ${
          isUser
            ? "border-accent/30 bg-accent/15 text-text"
            : "border-border bg-surface text-secondary"
        }`}
      >
        {!isUser && (
          <div className="mb-2 flex items-center gap-1.5">
            <Bot size={13} strokeWidth={2} className="text-accent-soft" />
            <span className="mono-label text-accent-soft">Quorum</span>
          </div>
        )}
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{message.body}</p>
        {message.markers?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.markers.map((marker) => (
              <span
                key={marker}
                className="inline-flex items-center gap-1 border border-border bg-bg px-1.5 py-1 font-mono text-[10px] text-tertiary"
              >
                <Check size={10} strokeWidth={2} className="text-good" />
                {marker}
              </span>
            ))}
          </div>
        ) : null}
        {message.actions?.length ? (
          <div className="mt-3 space-y-1.5">
            {message.actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex h-8 items-center justify-between border border-border bg-bg px-2 text-[12px] font-medium text-text transition-colors hover:border-border-strong hover:bg-surface2"
              >
                {action.label}
                <ChevronRight size={13} strokeWidth={2} className="text-tertiary" />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function answerQuestion(
  question: string,
  context: {
    deal: any | null;
    pipeline: any[];
    review: any;
    accountId?: Id<"accounts">;
  }
): Omit<ChatMessage, "id" | "role"> {
  const q = question.toLowerCase();
  const { deal, pipeline, review, accountId } = context;

  if (q.includes("pipeline") || (!deal && (q.includes("summarize") || q.includes("summary")))) {
    const active = pipeline.length;
    const reviewCount = pipeline.filter((account) => account.status === "needs_review").length;
    const actioned = pipeline.filter((account) => account.stage === "actioned").length;
    const pendingDrafts = review?.counts?.pendingDrafts ?? 0;
    const newest = pipeline[0];
    return {
      body: `Pipeline has ${active} active accounts. ${actioned} are fully actioned, ${reviewCount} need review, and ${pendingDrafts} draft${pendingDrafts === 1 ? "" : "s"} are waiting for approval.\n\nMost recent account: ${newest?.companyName ?? "none yet"}. The highest-leverage move is to keep review latency low, then connect CRM/email/calendar so Quorum can close the loop automatically.`,
      markers: ["pipeline read", "review queue checked"],
      actions: [{ label: "Open review queue", to: "/review" }],
    };
  }

  if (!deal) {
    return {
      body: "I’m in workspace mode right now. Open a specific account and I can explain its committee, risk, next move, drafts, and action history. From here, I can still help with pipeline, setup, integrations, or review queue questions.",
      markers: ["workspace context"],
      actions: [
        { label: "Open pipeline", to: "/pipeline" },
        { label: "Open setup", to: "/setup" },
      ],
    };
  }

  const account = deal.account;
  const contacts = deal.contacts ?? [];
  const committee = contacts.filter((contact: any) => !contact.isPrimary);
  const primary = contacts.find((contact: any) => contact.isPrimary) ?? contacts[0];
  const drafts = deal.drafts ?? [];
  const actions = deal.actions ?? [];
  const events = deal.events ?? [];
  const progress = deriveProgress(deal);
  const stage = STAGES[progress.reached]?.label ?? "Enriched";
  const topMove = account?.moves?.top_move;
  const gaps = account?.graph?.gaps ?? [];

  if (q.includes("risk") || q.includes("at risk") || q.includes("why")) {
    const risk = account?.moves?.deal_status?.replace(/_/g, " ") ?? "watching";
    const reasons = [
      topMove?.why,
      gaps[0],
      drafts.length ? `${drafts.length} outreach draft${drafts.length === 1 ? "" : "s"} exist and may need approval.` : null,
    ].filter(Boolean);
    return {
      body: `${account.companyName} is marked ${risk} because ${reasons.join(" ")}\n\nThe practical fix: ${topMove?.action ?? "map the missing buyer, then draft outreach to the highest-influence stakeholder."}`,
      markers: ["moves read", "committee gaps checked", "draft state checked"],
      actions: accountId ? [{ label: "Open review queue", to: "/review" }] : undefined,
    };
  }

  if (q.includes("missing") || q.includes("gap") || q.includes("committee") || q.includes("who")) {
    const members = committee
      .slice(0, 4)
      .map((contact: any) => `${contact.name} (${contact.role?.replace(/_/g, " ") ?? "stakeholder"})`)
      .join(", ");
    return {
      body: committee.length
        ? `Mapped committee: ${members}.\n\nOpen gaps: ${
            gaps.length ? gaps.map((gap: string) => `• ${gap}`).join("\n") : "no major gaps flagged. Core buying path looks covered."
          }`
        : `No verified committee beyond ${primary?.name ?? "the primary contact"} yet. Quorum should map real stakeholders before drafting broad outreach.`,
      markers: ["committee graph read", "verified-only mode"],
    };
  }

  if (q.includes("draft") || q.includes("email") || q.includes("outreach")) {
    const pending = drafts.filter((draft: any) => draft.status === "draft").length;
    return {
      body: pending
        ? `${pending} draft${pending === 1 ? "" : "s"} need review for ${account.companyName}. I’d approve the strongest buyer/champion draft first, then let Quorum sync the approved action once integrations are connected.`
        : drafts.length
          ? `${drafts.length} outreach draft${drafts.length === 1 ? " has" : "s have"} already been generated. No pending draft is currently blocking this account.`
          : `No outreach drafts exist yet. The next step is to use the committee map to draft persona-specific outreach.`,
      markers: ["drafts checked", "approval policy read"],
      actions: [{ label: "Open review queue", to: "/review" }],
    };
  }

  if (q.includes("action") || q.includes("integrat") || q.includes("sync") || q.includes("crm")) {
    const done = actions.filter((action: any) => action.status === "done").length;
    const pending = actions.filter((action: any) => action.status === "pending").length;
    return {
      body: `${account.companyName} has ${done} completed action${done === 1 ? "" : "s"} and ${pending} pending action${pending === 1 ? "" : "s"}.\n\nTo make this customer-onboarding viable, connect CRM, email, calendar, and Slack. Until then, Quorum can simulate or mark actions, but it cannot fully close the loop in the customer’s systems.`,
      markers: ["actions checked", "integrations policy read"],
      actions: [{ label: "Open integrations", to: "/integrations" }],
    };
  }

  return {
    body: `${account.companyName} is at the ${stage} stage. ${
      topMove?.action ? `Next move: ${topMove.action}` : "Next move is to map any missing stakeholders, then draft outreach."
    }\n\nCurrent signal: ${committee.length} committee member${committee.length === 1 ? "" : "s"}, ${drafts.length} draft${drafts.length === 1 ? "" : "s"}, ${events.length} event${events.length === 1 ? "" : "s"} in the account brain.`,
    markers: ["account brain read", "stage computed", "next move checked"],
    actions: [
      ...(drafts.some((draft: any) => draft.status === "draft")
        ? [{ label: "Review drafts", to: "/review" }]
        : []),
      { label: "Open integrations", to: "/integrations" },
    ],
  };
}
