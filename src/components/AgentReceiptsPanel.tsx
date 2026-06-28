import {
  AlertTriangle,
  Check,
  CircleDot,
  Clock3,
  LockKeyhole,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Panel from "./Panel";
import { timeAgo } from "../lib/format";

const AGENT_LABEL: Record<string, string> = {
  ingest: "Ingest",
  research: "Research",
  committee: "Committee",
  brain: "Account brain",
  outreach: "Outreach",
  actions: "Actions",
};

const TYPE_LABEL: Record<string, string> = {
  tool_call: "Tool call",
  reasoning: "Reasoning",
  draft: "Draft",
  approval_gate: "Gate",
  external_action: "External action",
};

const STATUS_ICON: Record<string, LucideIcon> = {
  completed: Check,
  blocked: LockKeyhole,
  failed: AlertTriangle,
  running: Clock3,
};

export default function AgentReceiptsPanel({
  agentRuns,
  events,
  actions,
  drafts,
  account,
}: {
  agentRuns: any[];
  events: any[];
  actions: any[];
  drafts: any[];
  account: any;
}) {
  const runs = agentRuns.length
    ? agentRuns
    : [buildStateReceipt({ events, actions, drafts, account })];
  const latest = runs[0];
  const steps = latest.steps ?? [];
  const completed = steps.filter((step: any) => step.status === "completed").length;
  const blocked = steps.filter((step: any) => step.status === "blocked" || step.status === "failed").length;
  const status = latest.status ?? (blocked ? "blocked" : "completed");

  return (
    <Panel
      label="Agent receipts"
      index="02"
      desc="What Quorum did, which tools it touched, and what is waiting."
      right={
        <span className={`mono-label tnum ${status === "completed" ? "text-good" : status === "running" ? "text-warn" : "text-accent-soft"}`}>
          {completed} done · {blocked} gated
        </span>
      }
    >
      <div className="grid min-h-0 grid-cols-1 gap-0 lg:grid-cols-[340px_1fr]">
        <div className="border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-accent-subtle text-accent-soft">
              <Sparkles size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="mono-label text-accent-soft">
                {agentRuns.length ? "Durable run" : "State receipt"}
              </p>
              <h3 className="mt-1 text-[16px] font-semibold leading-tight text-text">
                {latest.goal ?? `Work ${account.companyName} until the next safe decision`}
              </h3>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-secondary">
            {latest.summary ??
              "Quorum reconstructed this receipt from the current account state. New inbound and close-loop runs write durable tool receipts automatically."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="status" value={status} tone={status === "completed" ? "good" : "warn"} />
            <MiniStat
              label="started"
              value={latest.startedAt ? timeAgo(latest.startedAt) : "live"}
              tone="neutral"
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-2">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step: any, index: number) => (
              <ReceiptStep key={step._id ?? `${step.label}-${index}`} step={step} index={index + 1} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ReceiptStep({ step, index }: { step: any; index: number }) {
  const Icon = STATUS_ICON[step.status] ?? CircleDot;
  const statusClass =
    step.status === "completed"
      ? "text-good"
      : step.status === "blocked"
        ? "text-warn"
        : step.status === "failed"
          ? "text-risk"
          : "text-accent-soft";

  return (
    <div className="border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={14} strokeWidth={2.2} className={`shrink-0 ${statusClass}`} />
          <span className="mono-label truncate normal-case tracking-normal text-tertiary">
            {AGENT_LABEL[step.agent] ?? step.agent} · {TYPE_LABEL[step.type] ?? step.type}
          </span>
        </div>
        <span className="mono-label tnum text-tertiary">{String(index).padStart(2, "0")}</span>
      </div>
      <p className="mt-2 text-[13px] font-medium leading-snug text-text">{step.label}</p>
      {step.detail && (
        <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-secondary">{step.detail}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {step.tool && (
          <span className="border border-border bg-bg px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
            {step.tool}
          </span>
        )}
        <span className={`border px-1.5 py-0.5 font-mono text-[10px] ${statusClass} border-border bg-bg`}>
          {step.status}
        </span>
        {step.completedAt && (
          <span className="ml-auto font-mono text-[10px] text-tertiary">{timeAgo(step.completedAt)}</span>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  return (
    <div className="border border-border bg-bg px-3 py-2">
      <p className="mono-label normal-case tracking-normal text-tertiary">{label}</p>
      <p className={`mt-1 truncate font-mono text-[12px] ${tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-secondary"}`}>
        {value}
      </p>
    </div>
  );
}

function buildStateReceipt({
  events,
  actions,
  drafts,
  account,
}: {
  events: any[];
  actions: any[];
  drafts: any[];
  account: any;
}) {
  const now = Date.now();
  const hasCommittee = Boolean(account?.graph?.stakeholders?.length);
  const doneActions = actions.filter((action) => action.status === "done").length;
  const blockedActions = actions.filter((action) => action.status === "skipped" || action.status === "failed").length;
  const steps = [
    {
      agent: "ingest",
      type: "tool_call",
      status: "completed",
      label: "Account state loaded",
      detail: events[0]?.label ?? "Quorum has enriched account context available.",
      tool: account?.enrichment?.sources?.join(" + ") || "enrichment",
      completedAt: events[0]?._creationTime ?? now,
    },
    {
      agent: "committee",
      type: "reasoning",
      status: hasCommittee ? "completed" : "blocked",
      label: hasCommittee ? "Committee evidence available" : "Committee verification needed",
      detail: hasCommittee
        ? `${account.graph.stakeholders.length} stakeholder${account.graph.stakeholders.length === 1 ? "" : "s"} mapped with gaps tracked.`
        : "Only known contacts are shown. Map verified stakeholders before broad outreach.",
      completedAt: now,
    },
    {
      agent: "outreach",
      type: "approval_gate",
      status: drafts.length ? "completed" : "blocked",
      label: drafts.length ? "Drafts held for review" : "No customer-facing draft yet",
      detail: drafts.length
        ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"} exist behind a human review gate.`
        : "Quorum will draft after enough account and committee confidence exists.",
      completedAt: now,
    },
    {
      agent: "actions",
      type: "external_action",
      status: blockedActions ? "blocked" : doneActions ? "completed" : "running",
      label: doneActions || blockedActions ? "Destination actions evaluated" : "Waiting to close loop",
      detail: `${doneActions} completed, ${blockedActions} blocked by missing or unapproved destinations.`,
      completedAt: now,
    },
  ];

  return {
    _id: "state-receipt",
    trigger: "state",
    goal: `Explain ${account.companyName} agent work from current state`,
    status: blockedActions || !hasCommittee ? "blocked" : "completed",
    summary:
      "This account predates durable trace logging, so Quorum is showing a reconstructed state receipt. New agent runs write permanent step receipts.",
    startedAt: events.length ? events[events.length - 1]._creationTime : now,
    completedAt: now,
    steps,
  };
}
