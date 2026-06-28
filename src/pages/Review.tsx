import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ROLE_LABEL, timeAgo } from "../lib/format";
import { loadJson, saveJson } from "../lib/preferences";
import type { Id } from "../../convex/_generated/dataModel";

type DraftFilter = "pending" | "approved" | "sent" | "skipped" | "all";

const FILTERS: { key: DraftFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "skipped", label: "Skipped" },
  { key: "all", label: "All" },
];

const ACTION_UNLOCK: Record<string, string> = {
  slack: "Connect Composio + Slack",
  hubspot: "Connect Composio + HubSpot",
  calendar: "Connect Composio + Google Calendar",
  email: "Approve outreach and connect AgentMail",
};

export default function Review() {
  const reviewQueue = useQuery(api.queries.listReviewQueue, {});
  const reviewDraft = useMutation(api.mutations.reviewDraft);
  const updateDraft = useMutation(api.mutations.updateDraft);
  const [filter, setFilter] = useState<DraftFilter>("pending");
  const [working, setWorking] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ subject: "", body: "" });
  const [draftEdits, setDraftEdits] = useState<Record<string, { subject: string; body: string }>>(
    () => loadJson("quorum.draftEdits", {})
  );
  const [notice, setNotice] = useState<string | null>(null);

  const review = reviewQueue ?? { drafts: [], actions: [], counts: null };
  const drafts = review.drafts;
  const actions = review.actions;
  const counts = review.counts;
  const visibleDrafts = useMemo(() => {
    if (filter === "pending") return drafts.filter((draft: any) => draft.status === "draft");
    if (filter === "all") return drafts;
    return drafts.filter((draft: any) => draft.status === filter);
  }, [drafts, filter]);

  async function setStatus(draftId: Id<"drafts">, status: "approved" | "skipped") {
    if (status === "approved") {
      const draft = drafts.find((item: any) => item._id === draftId);
      const current = {
        subject: draftEdits[String(draftId)]?.subject ?? draft?.subject ?? "",
        body: draftEdits[String(draftId)]?.body ?? draft?.body ?? "",
      };
      const warnings = getDraftWarnings(current.subject, current.body);
      if (warnings.length) {
        setNotice("Fix draft QA warnings before approving.");
        setTimeout(() => setNotice(null), 3000);
        return;
      }
    }
    setWorking(`${draftId}:${status}`);
    try {
      await reviewDraft({ draftId, status });
    } finally {
      setWorking(null);
    }
  }

  async function saveEdit(draft: any) {
    const subject = edit.subject.trim();
    const body = edit.body.trim();
    if (!subject || !body) {
      setNotice("Subject and body are required.");
      setTimeout(() => setNotice(null), 3000);
      return;
    }
    setWorking(`${draft._id}:save`);
    try {
      // Only mirror the edit locally and close the editor once the server save
      // actually succeeds, so a reviewer never approves text that did not persist.
      await updateDraft({ draftId: draft._id, subject, body });
      const nextEdits = { ...draftEdits, [draft._id]: { subject, body } };
      setDraftEdits(nextEdits);
      saveJson("quorum.draftEdits", nextEdits);
      setEditId(null);
      setNotice("Draft saved.");
    } catch {
      setNotice("Could not save the draft. Your changes are still here, try again.");
    } finally {
      setWorking(null);
      setTimeout(() => setNotice(null), 3500);
    }
  }

  if (reviewQueue === undefined) return <Centered>Loading review queue…</Centered>;

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="mono-label shrink-0 text-tertiary">Review</span>
          <span className="h-4 w-px bg-border" />
          <h1 className="truncate text-[15px] font-semibold tracking-tight">Approval queue</h1>
        </div>
        <span className="mono-label tnum text-tertiary">
          {counts?.pendingDrafts ?? 0} pending · {counts?.actionIssues ?? 0} action issues
        </span>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-7">
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Metric label="Pending drafts" value={counts?.pendingDrafts ?? 0} tone="warn" />
          <Metric label="Approved" value={counts?.approvedDrafts ?? 0} tone="good" />
          <Metric label="Sent" value={counts?.sentDrafts ?? 0} />
          <Metric label="Action issues" value={counts?.actionIssues ?? 0} tone="warn" />
        </div>

        <section className="cell">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="mono-label">Outreach approvals</p>
              <p className="mt-1 text-[12px] text-tertiary">
                Drafts stay in review until approved. Real email send only picks up approved drafts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILTERS.map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    aria-pressed={active}
                    className={`rounded border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                      active
                        ? "border-accent/40 bg-accent/15 text-accent-soft"
                        : "border-border bg-surface text-secondary hover:border-border-strong hover:text-text"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          {notice && (
            <div role="status" className="border-b border-border px-4 py-2 text-[12px] text-warn">
              {notice}
            </div>
          )}

          {visibleDrafts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-secondary">No drafts in this view.</p>
              <p className="mt-1 text-[13px] text-tertiary">
                Work an account through committee mapping and outreach to fill the queue.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleDrafts.map((draft: any) => (
                <DraftReviewRow
                  key={draft._id}
                  draft={draft}
                  draftEdits={draftEdits}
                  editId={editId}
                  edit={edit}
                  working={working}
                  setEdit={setEdit}
                  setEditId={setEditId}
                  saveEdit={saveEdit}
                  setStatus={setStatus}
                />
              ))}
            </div>
          )}
        </section>

        <section className="cell mt-5">
          <span className="plus plus-tl" />
          <span className="plus plus-tr" />
          <span className="plus plus-bl" />
          <span className="plus plus-br" />
          <div className="border-b border-border px-4 py-3">
            <p className="mono-label">Action audit</p>
            <p className="mt-1 text-[12px] text-tertiary">
              Skipped and failed actions show what blocked real execution.
            </p>
          </div>
          {actions.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[14px] text-secondary">No action issues.</p>
              <p className="mt-1 text-[13px] text-tertiary">
                Cross-tool actions appear here when they need setup or retry.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {actions.map((action: any) => (
                <ActionAuditRow key={action._id} action={action} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ActionAuditRow({ action }: { action: any }) {
  // Only surface confidence/risk when the action actually carries them. No
  // synthesized telemetry on the surface whose whole job is honesty.
  const confidence = typeof action.confidence === "number" ? action.confidence : null;
  const risk = typeof action.risk === "string" ? action.risk : null;
  const blocker =
    action.audit?.lastError ??
    (action.requirements?.length ? `Requires ${action.requirements.join(", ")}.` : ACTION_UNLOCK[action.type] ?? "Check integration setup");

  return (
    <div className="grid items-center gap-3 px-4 py-3 md:grid-cols-[180px_1fr_200px]">
      <div className="min-w-0">
        <Link
          to={`/deal/${action.account._id}`}
          className="text-[13px] font-semibold text-text transition-colors hover:text-accent-soft"
        >
          {action.account.companyName}
        </Link>
        <p className="mono-label truncate normal-case tracking-normal text-tertiary">
          {action.account.domain}
        </p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={action.status} />
          <span className="mono-label normal-case tracking-normal text-tertiary">
            {action.system ?? action.type}
          </span>
          {confidence !== null && (
            <span className="mono-label normal-case tracking-normal text-accent-soft">
              {confidence}% confidence
            </span>
          )}
          {risk && (
            <span className="mono-label normal-case tracking-normal text-warn">{risk} risk</span>
          )}
        </div>
        <p className="mt-1 truncate text-[12px] text-secondary">{action.label}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{blocker}</p>
      </div>
      <Link
        to="/integrations"
        className="mono-label flex items-center justify-center gap-1.5 border border-border bg-surface px-3 py-2 normal-case tracking-normal text-secondary transition-colors hover:border-border-strong hover:text-text md:justify-end"
      >
        Connect to unlock
        <ArrowRight size={12} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-text";
  return (
    <div className="cell px-4 py-3">
      <span className="plus plus-tl" />
      <span className="plus plus-tr" />
      <span className="plus plus-bl" />
      <span className="plus plus-br" />
      <p className="mono-label">{label}</p>
      <p className={`mt-2 font-mono text-[22px] tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "approved" || status === "sent" || status === "done"
      ? "bg-good/10 text-good"
      : status === "draft" || status === "pending"
        ? "bg-warn/10 text-warn"
        : status === "failed"
          ? "bg-risk/10 text-risk"
          : "bg-secondary/10 text-secondary";
  return (
    <span className={`pill ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function DraftReviewRow({
  draft,
  draftEdits,
  editId,
  edit,
  working,
  setEdit,
  setEditId,
  saveEdit,
  setStatus,
}: {
  draft: any;
  draftEdits: Record<string, { subject: string; body: string }>;
  editId: string | null;
  edit: { subject: string; body: string };
  working: string | null;
  setEdit: React.Dispatch<React.SetStateAction<{ subject: string; body: string }>>;
  setEditId: React.Dispatch<React.SetStateAction<string | null>>;
  saveEdit: (draft: any) => Promise<void>;
  setStatus: (draftId: Id<"drafts">, status: "approved" | "skipped") => Promise<void>;
}) {
  const currentSubject = draftEdits[draft._id]?.subject ?? draft.subject;
  const currentBody = draftEdits[draft._id]?.body ?? draft.body;
  const warnings = getDraftWarnings(currentSubject, currentBody);
  const confidence = draft.confidence ?? inferDraftConfidence(draft, warnings);
  const blocked = warnings.length > 0;

  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[240px_1fr_200px]">
      <div className="min-w-0">
        <Link
          to={`/deal/${draft.account._id}`}
          className="text-[14px] font-semibold text-text transition-colors hover:text-accent-soft"
        >
          {draft.account.companyName}
        </Link>
        <p className="mono-label truncate normal-case tracking-normal text-tertiary">
          {draft.account.domain}
        </p>
        <div className="mt-3">
          <p className="truncate text-[13px] font-medium text-text">
            {draft.contact?.name ?? "Unknown contact"}
          </p>
          <p className="truncate text-[12px] text-tertiary">{draft.contact?.title}</p>
          <p className="mt-1 mono-label normal-case tracking-normal text-secondary">
            {ROLE_LABEL[draft.contact?.role] ?? draft.persona}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={draft.status} />
          <span className={`mono-label normal-case tracking-normal ${confidence >= 75 ? "text-accent-soft" : "text-warn"}`}>
            {confidence}% confidence
          </span>
          {blocked ? (
            <span className="mono-label normal-case tracking-normal text-risk">QA blocked</span>
          ) : null}
          <span className="mono-label normal-case tracking-normal text-tertiary">
            {timeAgo(draft._creationTime)}
          </span>
        </div>
        {editId === draft._id ? (
          <div className="mt-2 space-y-2">
            <label className="block">
              <span className="mono-label mb-1 block">Subject</span>
              <input
                value={edit.subject}
                onChange={(event) => setEdit((current) => ({ ...current, subject: event.target.value }))}
                className="h-9 w-full rounded border border-border bg-bg px-3 text-[12px] text-text outline-none focus:border-border-strong"
              />
            </label>
            <label className="block">
              <span className="mono-label mb-1 block">Body</span>
              <textarea
                value={edit.body}
                onChange={(event) => setEdit((current) => ({ ...current, body: event.target.value }))}
                rows={7}
                className="w-full resize-y rounded border border-border bg-bg px-3 py-2 text-[12px] leading-relaxed text-text outline-none focus:border-border-strong"
              />
            </label>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[13px] font-semibold text-text">{currentSubject}</p>
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border bg-bg p-3 text-[12px] leading-relaxed text-secondary">
              {currentBody}
            </p>
            <div className="mt-2 border border-border bg-transparent p-3">
              <p className="mono-label">Why Quorum wrote this</p>
              <p className="mt-1 text-[12px] leading-relaxed text-secondary">
                Signal: {draft.rationale?.signal ?? `${draft.account.companyName} has a mapped committee and needs persona-specific outreach.`}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
                Source: {draft.rationale?.source ?? "draft engine"} · Held for human approval before send.
              </p>
            </div>
            {warnings.length ? (
              <div className="mt-2 border border-risk/30 bg-transparent p-3">
                <p className="mono-label text-risk">Draft QA</p>
                <ul className="mt-1 space-y-1 text-[12px] leading-relaxed text-secondary">
                  {warnings.map((warning) => (
                    <li key={warning}>Fix: {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-col items-stretch justify-center gap-2">
        {editId === draft._id ? (
          <>
            <button
              type="button"
              onClick={() => saveEdit(draft)}
              disabled={working !== null}
              className="btn-primary h-9 px-3 text-[12px]"
            >
              {working === `${draft._id}:save` ? "Saving…" : "Save edit"}
            </button>
            <button
              type="button"
              onClick={() => setEditId(null)}
              disabled={working !== null}
              className="btn-secondary h-9 px-3 text-[12px]"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditId(draft._id);
              setEdit({ subject: currentSubject, body: currentBody });
            }}
            disabled={working !== null}
            className="btn-secondary h-9 px-3 text-[12px]"
          >
            Edit draft
          </button>
        )}
        <button
          type="button"
          onClick={() => setStatus(draft._id, "approved")}
          disabled={editId === draft._id || draft.status === "approved" || working !== null || blocked}
          className="btn-primary h-9 px-3 text-[12px]"
        >
          {blocked ? "Fix QA first" : working === `${draft._id}:approved` ? "Approving…" : "Approve draft"}
        </button>
        <button
          type="button"
          onClick={() => setStatus(draft._id, "skipped")}
          disabled={editId === draft._id || draft.status === "skipped" || working !== null}
          className="btn-secondary h-9 px-3 text-[12px]"
        >
          {working === `${draft._id}:skipped` ? "Skipping…" : "Skip draft"}
        </button>
        <Link
          to={`/deal/${draft.account._id}`}
          className="mono-label mt-1 text-center normal-case tracking-normal text-tertiary transition-colors hover:text-secondary"
        >
          Open account →
        </Link>
      </div>
    </article>
  );
}

function getDraftWarnings(subject: string, body: string): string[] {
  const text = `${subject}\n${body}`;
  const warnings: string[] = [];
  if (/\[(your company|seller|company|recipient|name|title)[^\]]*\]/i.test(text)) {
    warnings.push("remove unresolved placeholder text");
  }
  if (/\b(best|revolutionary|game-changing|cutting-edge|elevate|streamline)\b/i.test(text)) {
    warnings.push("replace vague marketing language with a concrete buyer outcome");
  }
  if (!/\?/.test(body)) warnings.push("add one clear ask");
  if (body.split(/\s+/).filter(Boolean).length > 130) warnings.push("shorten to under 130 words");
  return warnings;
}

function inferDraftConfidence(draft: any, warnings: string[]) {
  let score = 74;
  if (draft.contact?.email) score += 5;
  if (draft.contact?.role && draft.contact.role !== "unknown") score += 5;
  if (draft.rationale?.signal) score += 6;
  score -= warnings.length * 14;
  return Math.max(28, Math.min(92, score));
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid flex flex-1 items-center justify-center">
      <p className="mono-label normal-case tracking-normal text-secondary">{children}</p>
    </div>
  );
}
