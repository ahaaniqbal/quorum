import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ROLE_LABEL,
  ROLE_COLOR,
  STATUS_PILL,
  STATUS_LABEL,
  initials,
} from "../lib/format";

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
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-secondary">
          Deal Map
        </h2>
        <span className="chip py-0.5">{contacts.length} in committee</span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {primary && (
          <ContactCard contact={primary} drafts={drafts} highlight />
        )}

        <AnimatePresence initial={false}>
          {committee.map((c) => (
            <motion.div
              key={c._id}
              layout
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <ContactCard contact={c} drafts={drafts} />
            </motion.div>
          ))}
        </AnimatePresence>

        {committee.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-3 py-8 text-center">
            <p className="max-w-[200px] text-sm text-secondary">
              Map the rest of the buying committee from the account signal.
            </p>
            <button onClick={onMapCommittee} disabled={mapping} className="btn-primary">
              {mapping ? "Mapping…" : "Map committee"}
            </button>
          </div>
        )}
      </div>
    </div>
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

  return (
    <div
      className={`rounded-lg border bg-surface2 p-3 transition-colors ${
        highlight ? "border-accent/40" : "border-border hover:border-border"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent-soft">
          {initials(contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold">{contact.name}</p>
            {contact.isPrimary && (
              <span className="text-[10px] text-accent-soft">★</span>
            )}
          </div>
          <p className="truncate text-[11px] text-secondary">{contact.title}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
            ROLE_COLOR[contact.role] ?? ROLE_COLOR.unknown
          }`}
        >
          {ROLE_LABEL[contact.role] ?? "Unknown"}
        </span>
        <span className={`pill py-0.5 text-[10px] ${STATUS_PILL[contact.status]}`}>
          {STATUS_LABEL[contact.status]}
        </span>
        {draft && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-auto text-[11px] text-accent-soft hover:underline"
          >
            {open ? "Hide draft" : "View draft"}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && draft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="rounded-md border border-border bg-bg p-2.5">
              <p className="text-[11px] font-semibold text-text">{draft.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-secondary">
                {draft.body}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
