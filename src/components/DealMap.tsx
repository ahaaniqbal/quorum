import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ROLE_LABEL,
  ROLE_COLOR,
  STATUS_PILL,
  STATUS_LABEL,
  initials,
} from "../lib/format";
import Panel from "./Panel";

export default function DealMap({
  contacts,
  drafts,
  onMapCommittee,
  mapping,
}: {
  contacts: any[];
  drafts: any[];
  onMapCommittee: () => void;
  mapping: boolean;
}) {
  const committee = contacts.filter((c) => !c.isPrimary);
  const primary = contacts.find((c) => c.isPrimary);

  return (
    <Panel
      label="Deal Map"
      index="03"
      right={
        <span className="mono-label tnum text-tertiary">
          {String(contacts.length).padStart(2, "0")} in committee
        </span>
      }
    >
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {primary && <ContactCard contact={primary} drafts={drafts} highlight />}

        <AnimatePresence initial={false}>
          {committee.map((c) => (
            <motion.div
              key={c._id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.175, 0.885, 0.32, 1.1] }}
            >
              <ContactCard contact={c} drafts={drafts} />
            </motion.div>
          ))}
        </AnimatePresence>

        {committee.length === 0 && (
          <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
            <p className="max-w-[210px] text-[13px] leading-relaxed text-secondary">
              Map the rest of the buying committee from the account signal.
            </p>
            <button onClick={onMapCommittee} disabled={mapping} className="btn-primary">
              {mapping ? "Mapping…" : "Map committee"}
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ContactCard({
  contact,
  drafts,
  highlight,
}: {
  contact: any;
  drafts: any[];
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const draft = drafts.find((d) => d.contactId === contact._id);
  const linkedin = contact.enrichment?.linkedin as string | undefined;

  return (
    <div
      className={`group rounded-md border bg-surface p-3 transition-all duration-150 ease-vercel hover:border-border-strong hover:bg-surface2 ${
        highlight ? "border-[color:var(--accent)]/35" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border font-mono text-[11px] font-medium"
          style={{ color: "var(--accent)" }}
        >
          {initials(contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-medium text-text">{contact.name}</p>
            {contact.isPrimary && (
              <span style={{ color: "var(--accent)" }} className="text-[10px]">
                ★
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-tertiary">{contact.title}</p>
        </div>
        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noreferrer"
            className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            title="LinkedIn"
          >
            <span className="mono-label hover:text-secondary">in ↗</span>
          </a>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            ROLE_COLOR[contact.role] ?? ROLE_COLOR.unknown
          }`}
        >
          {ROLE_LABEL[contact.role] ?? "Unknown"}
        </span>
        <span className={`pill text-[10px] ${STATUS_PILL[contact.status]}`}>
          {STATUS_LABEL[contact.status]}
        </span>
        {draft && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="mono-label ml-auto normal-case tracking-normal text-accent-soft transition-colors hover:text-text"
          >
            {open ? "hide draft" : "view draft"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && draft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.1] }}
            className="mt-2.5 overflow-hidden"
          >
            <div className="rounded-md border border-border bg-bg p-3">
              <p className="mono-label mb-1 normal-case tracking-normal text-tertiary">
                {draft.status === "sent" ? "sent ✓" : "draft"}
              </p>
              <p className="text-[12px] font-medium text-text">{draft.subject}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-secondary">
                {draft.body}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
