import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Inbox,
  Mail,
  MessageSquare,
  PlugZap,
  Send,
  ShieldCheck,
  Sparkles,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { timeAgo } from "../lib/format";
import { loadSetupPrefs, type SetupPrefs } from "../lib/preferences";

type ShellContext = {
  openAskQuorum?: () => void;
};

const CONNECTORS: { key: keyof SetupPrefs; label: string; icon: LucideIcon }[] = [
  { key: "slackConnected", label: "Slack", icon: MessageSquare },
  { key: "crmConnected", label: "CRM", icon: Database },
  { key: "emailConnected", label: "Email", icon: Mail },
  { key: "calendarConnected", label: "Calendar", icon: CalendarDays },
];

const LOOP_STEPS: Array<{
  label: string;
  owner: string;
  detail: string;
  icon: LucideIcon;
}> = [
  {
    label: "Ingest",
    owner: "Quorum",
    detail: "New inbound, CSVs, and webhook leads enter one queue.",
    icon: Inbox,
  },
  {
    label: "Build brain",
    owner: "AI",
    detail: "Researches account, committee, buying role, and next move.",
    icon: BrainCircuit,
  },
  {
    label: "Review gate",
    owner: "You",
    detail: "Drafts and risky actions wait before anything customer-facing.",
    icon: ShieldCheck,
  },
  {
    label: "Close loop",
    owner: "Quorum",
    detail: "Approved work becomes CRM updates, messages, meetings, and alerts.",
    icon: Send,
  },
];

export default function Home() {
  const { openAskQuorum } = useOutletContext<ShellContext>();
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const review = useQuery(api.queries.listReviewQueue, {});
  const ingest = useQuery(api.inbound.getIngestInfo, {});
  const [setup, setSetup] = useState<SetupPrefs>(() => loadSetupPrefs());

  useEffect(() => {
    const sync = () => setSetup(loadSetupPrefs());
    window.addEventListener("storage", sync);
    window.addEventListener("quorum:prefs", sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("quorum:prefs", sync as EventListener);
    };
  }, []);

  const worked = pipeline.filter((account: any) => account.stage === "actioned").length;
  const needsReview = pipeline.filter((account: any) => account.stage !== "actioned").length;
  const pendingDrafts = review?.counts?.pendingDrafts ?? 0;
  const actionIssues = review?.counts?.actionIssues ?? 0;
  const connected = CONNECTORS.filter((connector) => setup[connector.key]).length;
  const webhookReady = Boolean(ingest?.url);
  const attentionCount = pendingDrafts + actionIssues + needsReview;

  const queue = useMemo(() => {
    const rows: {
      label: string;
      detail: string;
      to: string;
      tone?: "warn" | "good";
      cadence: string;
    }[] = [];
    if (pendingDrafts) {
      rows.push({
        label: `${pendingDrafts} draft${pendingDrafts === 1 ? "" : "s"} need approval`,
        detail: "Review copy before anything customer-facing sends.",
        to: "/review",
        tone: "warn",
        cadence: "now",
      });
    }
    if (actionIssues) {
      rows.push({
        label: `${actionIssues} action issue${actionIssues === 1 ? "" : "s"}`,
        detail: "Fix skipped or failed cross-tool actions.",
        to: "/review",
        tone: "warn",
        cadence: "now",
      });
    }
    const newestNeedsWork = pipeline.find((account: any) => account.stage !== "actioned");
    if (newestNeedsWork) {
      rows.push({
        label: `Work ${newestNeedsWork.companyName}`,
        detail: newestNeedsWork.lastLabel ?? "Continue the account brain.",
        to: `/deal/${newestNeedsWork._id}`,
        cadence: "today",
      });
    }
    if (!webhookReady || connected < CONNECTORS.length) {
      rows.push({
        label: "Finish launch setup",
        detail: `${connected} / ${CONNECTORS.length} destinations connected, webhook ${
          webhookReady ? "ready" : "not generated"
        }.`,
        to: "/setup",
        cadence: "before launch",
      });
    }
    if (!rows.length) {
      rows.push({
        label: "Everything is clear",
        detail: "No review blockers. Quorum is ready for new inbound.",
        to: "/pipeline",
        tone: "good",
        cadence: "when inbound lands",
      });
    }
    return rows.slice(0, 4);
  }, [actionIssues, connected, pendingDrafts, pipeline, webhookReady]);

  const recent = pipeline.slice(0, 5);
  const nextCheck =
    pendingDrafts || actionIssues
      ? "now"
      : needsReview
        ? "today"
        : !webhookReady || connected < CONNECTORS.length
          ? "before launch"
          : "on inbound";

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label shrink-0 text-tertiary">Home</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Today’s command center</h1>
        </div>
        <span className="mono-label tnum text-tertiary">
          {String(attentionCount).padStart(2, "0")} attention
        </span>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-7">
        <section className="cell mb-5 overflow-hidden p-0">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-5">
              <p className="mono-label">Operating loop</p>
              <h2 className="mt-2 max-w-2xl text-[24px] font-semibold leading-tight tracking-tight text-text">
                Quorum works accounts until a human decision is needed.
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-secondary">
                The product is simple on purpose: feed Quorum leads, let the account brain run,
                review customer-facing work, then watch approved actions land in your systems.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {LOOP_STEPS.map((step, index) => (
                  <LoopStep key={step.label} step={step} index={index + 1} />
                ))}
              </div>
              <button
                type="button"
                onClick={openAskQuorum}
                className="mt-4 block w-full bg-[linear-gradient(135deg,var(--accent),#7a2d0d_42%,#2a211b)] p-px text-left transition-opacity hover:opacity-95"
              >
                <span className="flex items-center justify-between bg-[#0d0d0c] px-3 py-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Sparkles size={15} strokeWidth={2} className="shrink-0 text-accent-soft" />
                    <span className="truncate text-[13px] text-secondary">
                      Ask Quorum “what changed and what should I do next?”
                    </span>
                  </span>
                  <ChevronRight size={15} strokeWidth={2} className="shrink-0 text-tertiary" />
                </span>
              </button>
            </div>
            <div className="border-t border-border p-5 lg:border-l lg:border-t-0">
              <p className="mono-label">Autopilot health</p>
              <div className="mt-3 space-y-2">
                <HealthRow
                  done={webhookReady}
                  icon={Webhook}
                  label="Inbound webhook"
                  detail={webhookReady ? "ready" : "generate in setup"}
                />
                {CONNECTORS.map((connector) => (
                  <HealthRow
                    key={connector.key}
                    done={setup[connector.key]}
                    icon={connector.icon}
                    label={connector.label}
                    detail={setup[connector.key] ? "connected" : "not connected"}
                  />
                ))}
              </div>
              <Link className="btn-secondary mt-4 h-9 w-full px-3 text-[12px]" to="/integrations">
                Open integrations
              </Link>
            </div>
          </div>
        </section>

        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Attention queue" value={attentionCount} detail="reviews, actions, active work" tone={attentionCount ? "warn" : "good"} />
          <Metric label="Active accounts" value={pipeline.length} detail={`${worked} fully worked`} />
          <Metric label="Pending drafts" value={pendingDrafts} detail="approval queue" tone={pendingDrafts ? "warn" : "good"} to="/review" />
          <Metric label="Next check" value={nextCheck} detail={webhookReady ? "operator cadence" : "finish setup first"} tone={attentionCount ? "warn" : "good"} to={attentionCount ? "/review" : "/setup"} />
        </div>

        <section className="cell mb-5 p-4">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mono-label">Operating cadence</p>
              <p className="mt-1 text-[12px] text-tertiary">
                This is the rhythm: Quorum runs continuously, you only step in at review gates and launch gaps.
              </p>
            </div>
            <Link to="/setup" className="mono-label normal-case tracking-normal text-accent-soft">
              tune controls →
            </Link>
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            <CadenceCard
              icon={AlertTriangle}
              label="Watch now"
              detail={`${attentionCount} item${attentionCount === 1 ? "" : "s"} need a decision before Quorum can safely continue.`}
              status={attentionCount ? "Review queue" : "No blockers"}
              tone={attentionCount ? "warn" : "good"}
              to="/review"
            />
            <CadenceCard
              icon={Clock3}
              label="Check every 15 min"
              detail={`${needsReview} active account${needsReview === 1 ? "" : "s"} may produce new drafts or action issues.`}
              status="Active work"
              to="/pipeline"
            />
            <CadenceCard
              icon={PlugZap}
              label="Audit daily"
              detail={`${connected} / ${CONNECTORS.length} action destinations connected. More connections mean fewer manual handoffs.`}
              status={connected === CONNECTORS.length && webhookReady ? "Launch ready" : "Setup gap"}
              tone={connected === CONNECTORS.length && webhookReady ? "good" : "warn"}
              to="/integrations"
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
          <section className="cell p-4">
            <span className="plus plus-tl" />
            <span className="plus plus-tr" />
            <span className="plus plus-bl" />
            <span className="plus plus-br" />
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="mono-label">Today’s queue</p>
              <Link to="/review" className="mono-label normal-case tracking-normal text-accent-soft">
                review all →
              </Link>
            </div>
            <div className="space-y-2">
              {queue.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center gap-3 border border-border bg-surface px-3 py-3 transition-colors hover:border-border-strong hover:bg-surface2"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center border ${
                      item.tone === "good"
                        ? "border-good/30 bg-good/10 text-good"
                        : item.tone === "warn"
                          ? "border-warn/30 bg-warn/10 text-warn"
                          : "border-accent-subtle bg-transparent text-accent-soft"
                    }`}
                  >
                    {item.tone === "good" ? (
                      <CheckCircle2 size={14} strokeWidth={2} />
                    ) : item.tone === "warn" ? (
                      <AlertTriangle size={14} strokeWidth={2} />
                    ) : (
                      <Inbox size={14} strokeWidth={2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text">{item.label}</span>
                    <span className="block truncate text-[12px] text-tertiary">{item.detail}</span>
                  </span>
                  <span className="mono-label hidden shrink-0 normal-case tracking-normal text-tertiary sm:block">
                    {item.cadence}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="text-tertiary" />
                </Link>
              ))}
            </div>
          </section>

          <section className="cell p-4">
            <span className="plus plus-tl" />
            <span className="plus plus-tr" />
            <span className="plus plus-bl" />
            <span className="plus plus-br" />
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="mono-label">Recent work</p>
              <Link to="/pipeline" className="mono-label normal-case tracking-normal text-accent-soft">
                pipeline →
              </Link>
            </div>
            <div className="space-y-2">
              {recent.map((account: any) => (
                <Link
                  key={account._id}
                  to={`/deal/${account._id}`}
                  className="flex items-center gap-3 border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface2"
                >
                  <CompanyLogo account={account} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-text">{account.companyName}</span>
                    <span className="block truncate text-[12px] text-tertiary">{account.lastLabel}</span>
                  </span>
                  <span className="mono-label shrink-0 text-tertiary">{timeAgo(account.lastActivity)}</span>
                </Link>
              ))}
              {recent.length === 0 && (
                <div className="border border-border bg-surface px-3 py-6 text-center text-[12px] text-tertiary">
                  No account work yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <QuickLink
            icon={Inbox}
            label="Work inbound"
            detail="Paste emails, upload CSV, or simulate an inbound burst."
            to="/pipeline"
          />
          <QuickLink
            icon={AlertTriangle}
            label="Approve customer-facing work"
            detail="Review generated drafts and action issues."
            to="/review"
          />
          <QuickLink
            icon={PlugZap}
            label="Connect customer systems"
            detail="CRM, email, calendar, Slack, and inbound sources."
            to="/integrations"
          />
        </section>
      </div>
    </div>
  );
}

function HealthRow({
  done,
  icon: Icon,
  label,
  detail,
}: {
  done: boolean;
  icon: LucideIcon;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-border bg-surface px-2.5 py-2">
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          size={13}
          strokeWidth={1.8}
          className={`shrink-0 ${done ? "text-good" : "text-tertiary"}`}
        />
        <span className="truncate text-[12px] font-medium text-text">{label}</span>
      </span>
      <span className="mono-label shrink-0 normal-case tracking-normal text-tertiary">{detail}</span>
    </div>
  );
}

function LoopStep({
  step,
  index,
}: {
  step: { label: string; owner: string; detail: string; icon: LucideIcon };
  index: number;
}) {
  const Icon = step.icon;
  return (
    <div className="border border-border bg-surface/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex h-7 w-7 items-center justify-center border border-accent-subtle bg-transparent text-accent-soft">
          <Icon size={14} strokeWidth={2} />
        </span>
        <span className="mono-label tnum text-tertiary">0{index}</span>
      </div>
      <p className="truncate text-[12px] font-semibold text-text">{step.label}</p>
      <p className="mono-label mt-1 normal-case tracking-normal text-accent-soft">{step.owner}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-tertiary">{step.detail}</p>
    </div>
  );
}

function CadenceCard({
  icon: Icon,
  label,
  detail,
  status,
  tone = "neutral",
  to,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  status: string;
  tone?: "neutral" | "good" | "warn";
  to: string;
}) {
  const toneClass =
    tone === "good"
      ? "border-good/30 bg-good/10 text-good"
      : tone === "warn"
        ? "border-warn/30 bg-warn/10 text-warn"
        : "border-accent-subtle bg-transparent text-accent-soft";

  return (
    <Link
      to={to}
      className="group flex min-h-[124px] flex-col justify-between border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface2"
    >
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className={`flex h-7 w-7 items-center justify-center border ${toneClass}`}>
            <Icon size={14} strokeWidth={2} />
          </span>
          <span className="mono-label normal-case tracking-normal text-tertiary">{status}</span>
        </div>
        <p className="text-[13px] font-semibold text-text">{label}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{detail}</p>
      </div>
      <span className="mt-3 mono-label normal-case tracking-normal text-accent-soft">
        open →
      </span>
    </Link>
  );
}

function CompanyLogo({ account }: { account: any }) {
  const domain =
    account.domain ||
    account.enrichment?.domain ||
    account.enrichment?.website ||
    fallbackDomain(account.companyName);
  const source =
    domain
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
      : account.logoUrl || null;

  if (source) {
    return (
      <img
        src={source}
        alt={account.companyName ?? ""}
        className="h-[30px] w-[30px] shrink-0 border border-border bg-white object-contain p-1"
      />
    );
  }

  return (
    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center border border-border bg-surface font-mono text-[11px] font-semibold text-secondary">
      {account.companyName?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}

function fallbackDomain(companyName?: string) {
  const normalized = companyName?.toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === "notion") return "notion.so";
  if (normalized === "vercel") return "vercel.com";
  if (normalized === "ramp") return "ramp.com";
  return `${normalized.replace(/[^a-z0-9]+/g, "")}.com`;
}

function Metric({
  label,
  value,
  detail,
  tone = "neutral",
  to,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "neutral" | "good" | "warn";
  to?: string;
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-text";
  const className = "cell block px-4 py-3 text-left transition-colors duration-150 hover:border-border-strong";
  const content = (
    <>
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <p className="mono-label">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className={`font-mono text-[20px] tabular-nums ${toneClass}`}>{value}</p>
        <p className="truncate text-[12px] text-tertiary">{detail}</p>
      </div>
    </>
  );
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function QuickLink({
  icon: Icon,
  label,
  detail,
  to,
}: {
  icon: LucideIcon;
  label: string;
  detail: string;
  to: string;
}) {
  return (
    <Link className="cell flex items-center gap-3 p-4 transition-colors hover:border-border-strong" to={to}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-accent-subtle bg-transparent text-accent-soft">
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-text">{label}</span>
        <span className="block truncate text-[12px] text-tertiary">{detail}</span>
      </span>
      <ChevronRight size={14} strokeWidth={2} className="text-tertiary" />
    </Link>
  );
}
