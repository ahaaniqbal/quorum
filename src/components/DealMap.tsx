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
import { Avatar } from "./Avatar";
import { copy } from "../copy";
import CommitteeGraph from "./CommitteeGraph";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

export default function DealMap({
  contacts,
  drafts,
  graph,
  moves,
  onMapCommittee,
  mapping,
}: {
  contacts: any[];
  drafts: any[];
  graph?: any;
  moves?: any;
  onMapCommittee: () => void;
  mapping: boolean;
}) {
  const committee = contacts.filter((c) => !c.isPrimary);
  const primary = contacts.find((c) => c.isPrimary);
  const [selected, setSelected] = useState<string | undefined>();
  const hasGraph = (graph?.stakeholders?.length ?? 0) > 0;

  const moveFor = (c: any) =>
    (moves?.moves ?? []).find(
      (m: any) => m.name?.toLowerCase() === c.name?.toLowerCase()
    );

  return (
    <Panel
      label="Committee"
      index="03"
      desc={copy.panels.dealMap.desc}
      className="min-h-[520px] xl:min-h-0"
      right={
        <span className="mono-label tnum text-tertiary">
          {String(contacts.length).padStart(2, "0")} in committee
        </span>
      }
    >
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {hasGraph && (
          <div className="dot-grid mb-1 border border-border py-2">
            <CommitteeGraph
              graph={graph}
              contacts={contacts}
              selectedId={selected}
              onSelect={(email) => setSelected((s) => (s === email ? undefined : email))}
            />
          </div>
        )}

        {primary && <ContactCard contact={primary} drafts={drafts} move={moveFor(primary)} highlight />}

        <AnimatePresence initial={false}>
          {committee.map((c) => (
            <motion.div
              key={c._id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.175, 0.885, 0.32, 1.1] }}
            >
              <ContactCard
                contact={c}
                drafts={drafts}
                move={moveFor(c)}
                highlight={selected === c.email}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {committee.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <p className="max-w-[220px] text-[13px] leading-relaxed text-secondary">
              {mapping ? copy.loading.mapping : copy.empty.dealMap}
            </p>
            {!mapping && (
              <button onClick={onMapCommittee} className="btn-secondary h-9 text-[12px]">
                Map committee now
              </button>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ContactCard({
  contact,
  drafts,
  move,
  highlight,
}: {
  contact: any;
  drafts: any[];
  move?: any;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const draft = drafts.find((d) => d.contactId === contact._id);
  const linkedin = contact.enrichment?.linkedin as string | undefined;

  return (
    <div
      className={`group border bg-surface p-3 transition-all duration-150 ease-vercel hover:border-border-strong hover:bg-surface2 ${
        highlight ? "border-[color:var(--accent)]/40" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar
          photoUrl={contact.enrichment?.profilePic}
          email={contact.email}
          name={contact.name}
          size={36}
        />
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
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`cursor-help rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                ROLE_COLOR[contact.role] ?? ROLE_COLOR.unknown
              }`}
            >
              {ROLE_LABEL[contact.role] ?? "Unknown"}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <span className="mono-label mb-1 block text-tertiary">why this person</span>
            {contact.persona ?? "Stakeholder in the buying committee."}
          </TooltipContent>
        </Tooltip>
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

      {move?.action && (
        <div className="mt-2 flex items-start gap-1.5 border-t border-border pt-2">
          <span className="mono-label mt-0.5 shrink-0 text-accent-soft">→ next</span>
          <p className="text-[12px] leading-snug text-secondary">{move.action}</p>
        </div>
      )}

      <AnimatePresence>
        {open && draft && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.175, 0.885, 0.32, 1.1] }}
            className="mt-2.5 overflow-hidden"
          >
            <div className="border border-border bg-bg p-3">
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
