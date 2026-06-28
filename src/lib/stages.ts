export type StageKey =
  | "enriched"
  | "qualified"
  | "committee"
  | "outreach"
  | "actioned";

export const STAGES: { key: StageKey; label: string; verb: string }[] = [
  { key: "enriched", label: "Enriched", verb: "Enriching account" },
  { key: "qualified", label: "Qualified", verb: "Qualifying on a live call" },
  { key: "committee", label: "Committee", verb: "Mapping the buying committee" },
  { key: "outreach", label: "Outreach", verb: "Drafting persona outreach" },
  { key: "actioned", label: "Actioned", verb: "Firing cross-tool actions" },
];

export const STAGE_INDEX: Record<StageKey, number> = {
  enriched: 0,
  qualified: 1,
  committee: 2,
  outreach: 3,
  actioned: 4,
};

// Derive how far a deal has progressed from its reactive data.
export function deriveProgress(data: {
  account: any;
  contacts: any[];
  latestConversation: any;
  drafts: any[];
  actions: any[];
} | null): {
  reached: number; // index of furthest completed stage
  callLive: boolean;
  done: boolean;
} {
  if (!data) return { reached: 0, callLive: false, done: false };
  const committee = data.contacts.filter((c: any) => !c.isPrimary).length;
  const convo = data.latestConversation;
  const callLive = convo?.status === "live";
  const actioned =
    data.account?.status === "actioned" ||
    data.actions.some((a: any) => a.status === "done");

  let reached = 0; // enriched
  if (convo?.status === "ended") reached = 1; // qualified
  if (committee > 0) reached = Math.max(reached, 2); // committee
  if (data.drafts.length > 0) reached = Math.max(reached, 3); // outreach
  if (actioned) reached = Math.max(reached, 4); // actioned

  return { reached, callLive, done: reached >= 4 };
}
