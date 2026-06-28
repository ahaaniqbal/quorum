import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQuery } from "convex/react";
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
  const pipeline = useQuery(api.queries.listPipeline, {});
  const accountQueries = useMemo(() => {
    const entries = (pipeline ?? []).map((account: any) => [
      account._id,
      {
        query: api.queries.getAccountFull,
        args: { accountId: account._id as Id<"accounts"> },
      },
    ]);
    return Object.fromEntries(entries);
  }, [pipeline]);
  const accountResults = useQueries(accountQueries);
  const setDraftStatus = useMutation(api.mutations.setDraftStatus);
  const updateDraft = useMutation(api.mutations.updateDraft);
  const [filter, setFilter] = useState<DraftFilter>("pending");
  const [working, setWorking] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ subject: "", body: "" });
  const [draftEdits, setDraftEdits] = useState<Record<string, { subject: string; body: string }>>(
    () => loadJson("quorum.draftEdits", {})
  );
  const [notice, setNotice] = useState<string | null>(null);

  const review = useMemo(() => buildReviewState(accountResults), [accountResults]);
  const drafts = review.drafts;
  const actions = review.actions;
  const counts = review.counts;
  const visibleDrafts = useMemo(() => {
    if (filter === "pending") return drafts.filter((draft: any) => draft.status === "draft");
    if (filter === "all") return drafts;
    return drafts.filter((draft: any) => draft.status === filter);
  }, [drafts, filter]);

  async function setStatus(draftId: Id<"drafts">, status: "approved" | "skipped") {
    setWorking(`${draftId}:${status}`);
    try {
      await setDraftStatus({ draftId, status });
    } finally {
      setWorking(null);
    }
  }

  async function saveEdit(draft: any) {
    const subject = edit.subject.trim();
    const body = edit.body.trim();
    if (!subject || !body) {
      setNotice("Subject and body are required.");
      return;
    }
    setWorking(`${draft._id}:save`);
    const nextEdits = { ...draftEdits, [draft._id]: { subject, body } };
    try {
      await updateDraft({ draftId: draft._id, subject, body });
      setNotice("Draft saved.");
    } catch {
      setNotice("Draft saved locally. Deploy backend functions to persist edits server-side.");
    } finally {
      setDraftEdits(nextEdits);
      saveJson("quorum.draftEdits", nextEdits);
      setEditId(null);
      setWorking(null);
      setTimeout(() => setNotice(null), 3000);
    }
  }

  if (pipeline === undefined) return <Centered>Loading review queue…</Centered>;

  return (
    <div className="dot-grid flex-1 overflow-y-auto">
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
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
                <article key={draft._id} className="grid gap-4 px-4 py-4 lg:grid-cols-[240px_1fr_200px]">
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
                        <p className="mt-2 text-[13px] font-semibold text-text">
                          {draftEdits[draft._id]?.subject ?? draft.subject}
                        </p>
                        <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap border border-border bg-bg p-3 text-[12px] leading-relaxed text-secondary">
                          {draftEdits[draft._id]?.body ?? draft.body}
                        </p>
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
                          setEdit({
                            subject: draftEdits[draft._id]?.subject ?? draft.subject,
                            body: draftEdits[draft._id]?.body ?? draft.body,
                          });
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
                      disabled={editId === draft._id || draft.status === "approved" || working !== null}
                      className="btn-primary h-9 px-3 text-[12px]"
                    >
                      {working === `${draft._id}:approved` ? "Approving…" : "Approve draft"}
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
                <div
                  key={action._id}
                  className="grid items-center gap-3 px-4 py-3 md:grid-cols-[180px_1fr_220px]"
                >
                  <div>
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
                        {action.type}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-secondary">{action.label}</p>
                  </div>
                  <p className="mono-label normal-case tracking-normal text-tertiary md:text-right">
                    {ACTION_UNLOCK[action.type] ?? "Check integration setup"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
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

function buildReviewState(accountResults: Record<string, any>) {
  const drafts: any[] = [];
  const actions: any[] = [];

  for (const result of Object.values(accountResults)) {
    if (!result || result instanceof Error || !result.account) continue;
    const contactById = new Map(
      (result.contacts ?? []).map((contact: any) => [String(contact._id), contact])
    );
    for (const draft of result.drafts ?? []) {
      drafts.push({
        ...draft,
        account: {
          _id: result.account._id,
          companyName: result.account.companyName,
          domain: result.account.domain,
          logoUrl: result.account.logoUrl,
        },
        contact: contactById.get(String(draft.contactId)) ?? null,
      });
    }
    for (const action of result.actions ?? []) {
      if (!["pending", "failed", "skipped"].includes(action.status)) continue;
      actions.push({
        ...action,
        account: {
          _id: result.account._id,
          companyName: result.account.companyName,
          domain: result.account.domain,
          logoUrl: result.account.logoUrl,
        },
      });
    }
  }

  drafts.sort((a, b) => b._creationTime - a._creationTime);
  actions.sort((a, b) => b._creationTime - a._creationTime);

  return {
    drafts,
    actions,
    counts: {
      pendingDrafts: drafts.filter((draft) => draft.status === "draft").length,
      approvedDrafts: drafts.filter((draft) => draft.status === "approved").length,
      skippedDrafts: drafts.filter((draft) => draft.status === "skipped").length,
      sentDrafts: drafts.filter((draft) => draft.status === "sent").length,
      actionIssues: actions.length,
    },
  };
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

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid flex flex-1 items-center justify-center">
      <p className="mono-label normal-case tracking-normal text-secondary">{children}</p>
    </div>
  );
}
