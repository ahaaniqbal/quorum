export type StageKey = "enriched" | "committee" | "outreach" | "actioned";

// The reliable spine: runs with zero voice involved. The live call is a
// separate, optional action shown in the Call panel.
export const STAGES: { key: StageKey; label: string; verb: string }[] = [
  { key: "enriched", label: "Enriched", verb: "Enriching account" },
  { key: "committee", label: "Committee", verb: "Mapping the buying committee" },
  { key: "outreach", label: "Outreach", verb: "Drafting persona outreach" },
  { key: "actioned", label: "Actioned", verb: "Firing cross-tool actions" },
];

export const STAGE_INDEX: Record<StageKey, number> = {
  enriched: 0,
  committee: 1,
  outreach: 2,
  actioned: 3,
};

// Derive how far a deal has progressed (the spine, independent of voice).
export function deriveProgress(data: {
  account: any;
  contacts: any[];
  latestConversation: any;
  drafts: any[];
  actions: any[];
} | null): {
  reached: number;
  callLive: boolean;
  done: boolean;
} {
  if (!data) return { reached: 0, callLive: false, done: false };
  const committee = data.contacts.filter((c: any) => !c.isPrimary).length;
  const callLive = data.latestConversation?.status === "live";
  const actioned =
    data.account?.status === "actioned" ||
    data.actions.some((a: any) => a.status === "done");

  let reached = 0; // enriched
  if (committee > 0) reached = 1;
  if (data.drafts.length > 0) reached = Math.max(reached, 2);
  if (actioned) reached = Math.max(reached, 3);

  return { reached, callLive, done: reached >= 3 };
}
