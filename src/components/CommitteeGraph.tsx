import { ArrowRight } from "lucide-react";
import { Avatar } from "./Avatar";

type Stakeholder = {
  id?: string;
  name?: string;
  title?: string | null;
  email?: string | null;
  role?: string;
  engagement?: string;
  influence?: string;
  confidence?: number;
  rationale?: string;
};

type Slot = {
  id: string;
  label: string;
  node?: Stakeholder;
  emphasis?: "primary" | "buyer" | "normal";
};

const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic buyer",
  technical_approver: "Technical",
  user: "User",
  influencer: "Influencer",
  blocker: "Blocker",
  unknown: "Stakeholder",
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  engaged: "Engaged",
  contacted: "Contacted",
  dark: "Dark",
  not_contacted: "Not contacted",
};

const ROLE_PRIORITY: Record<string, number> = {
  economic_buyer: 0,
  champion: 1,
  technical_approver: 2,
  user: 3,
  influencer: 4,
  blocker: 5,
  unknown: 6,
};

const INFLUENCE_PRIORITY: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function stakeholderKey(stakeholder: Stakeholder) {
  return stakeholder.email ?? stakeholder.id ?? stakeholder.name ?? "";
}

function roleLabel(role?: string) {
  if (!role) return "Stakeholder";
  return ROLE_LABEL[role] ?? role.replace(/_/g, " ");
}

function gapLabel(gap: string): string {
  const match = gap.match(
    /\b(security|IT|finance|cfo|legal|procurement|revops|revenue operations|engineering|technical|champion|economic buyer|data|compliance|it\/security)\b/i
  );
  if (match) return match[0].replace(/\bit\b/i, "IT");
  return gap.split(/[,.]/)[0].trim().slice(0, 28);
}

function confidenceLabel(value?: number) {
  if (typeof value !== "number") return "signal";
  return `${Math.round(value * 100)}% signal`;
}

export default function CommitteeGraph({
  graph,
  contacts,
  onSelect,
  selectedId,
}: {
  graph: any;
  contacts: any[];
  onSelect: (email?: string) => void;
  selectedId?: string;
}) {
  const stakeholders: Stakeholder[] = (graph?.stakeholders ?? []).slice(0, 7);
  const gaps: string[] = (graph?.gaps ?? []).slice(0, 3);
  const used = new Set<string>();

  const sorted = [...stakeholders].sort((a, b) => {
    const roleDelta = (ROLE_PRIORITY[a.role ?? "unknown"] ?? 9) - (ROLE_PRIORITY[b.role ?? "unknown"] ?? 9);
    if (roleDelta !== 0) return roleDelta;
    return (INFLUENCE_PRIORITY[a.influence ?? "low"] ?? 9) - (INFLUENCE_PRIORITY[b.influence ?? "low"] ?? 9);
  });

  const take = (predicate: (stakeholder: Stakeholder) => boolean) => {
    const stakeholder = sorted.find((candidate) => {
      const key = stakeholderKey(candidate);
      return key && !used.has(key) && predicate(candidate);
    });
    if (stakeholder) used.add(stakeholderKey(stakeholder));
    return stakeholder;
  };

  const buyer = take((stakeholder) => stakeholder.role === "economic_buyer");
  const champion = take((stakeholder) => stakeholder.role === "champion") ?? take((stakeholder) => stakeholder.engagement === "engaged");
  const technical = take((stakeholder) => stakeholder.role === "technical_approver") ?? take((stakeholder) => stakeholder.role === "user");
  const support = take((stakeholder) => stakeholder.role === "influencer" || stakeholder.role === "blocker") ?? take(() => true);
  const remaining = sorted.filter((stakeholder) => {
    const key = stakeholderKey(stakeholder);
    return key && !used.has(key);
  });

  const slots: Slot[] = [
    { id: "champion", label: "Internal champion", node: champion, emphasis: "primary" as const },
    { id: "buyer", label: "Budget owner", node: buyer, emphasis: "buyer" as const },
    { id: "technical", label: "Implementation owner", node: technical, emphasis: "normal" as const },
    { id: "support", label: "Influence path", node: support, emphasis: "normal" as const },
  ].filter((slot) => slot.node);

  const avatarFor = (stakeholder: Stakeholder) => {
    const contact = contacts.find(
      (candidate) =>
        candidate.email === stakeholder.email ||
        candidate.name?.toLowerCase() === stakeholder.name?.toLowerCase()
    );
    return contact?.enrichment?.profilePic as string | undefined;
  };

  const hasBuyer = slots.some((slot) => slot.id === "buyer");
  const missingRoles = gaps.length ? gaps : hasBuyer ? [] : ["No verified economic buyer identified yet."];

  const renderCard = (slot: Slot) => {
    const stakeholder = slot.node!;
    const selected = selectedId && stakeholder.email === selectedId;
    const isBuyer = stakeholder.role === "economic_buyer";
    const isChampion = stakeholder.role === "champion";
    return (
      <button
        key={`${slot.id}-${stakeholderKey(stakeholder)}`}
        onClick={() => onSelect(stakeholder.email ?? undefined)}
        className={`group relative flex h-full w-full min-w-0 flex-col justify-between border bg-surface/95 p-2.5 text-left shadow-cell transition-all duration-fast ease-vercel hover:border-border-strong hover:bg-surface2 hover:brightness-110 ${
          selected ? "border-accent/40" : "border-border"
        }`}
        title={stakeholder.rationale}
      >
        <span
          className="absolute left-0 top-0 h-full w-1"
          style={{
            background:
              isBuyer || isChampion
                ? "var(--accent)"
                : "rgba(255,255,255,0.16)",
          }}
        />
        <div className="flex items-center gap-2.5 pl-1.5">
          <Avatar
            photoUrl={avatarFor(stakeholder)}
            email={stakeholder.email}
            name={stakeholder.name}
            size={34}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text">{stakeholder.name}</p>
            <p className="truncate text-[11px] text-tertiary">{stakeholder.title ?? slot.label}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 pl-1.5">
          <span
            className={`mono-label truncate normal-case tracking-normal ${
              isBuyer ? "text-good" : isChampion ? "text-accent-soft" : "text-secondary"
            }`}
          >
            {roleLabel(stakeholder.role)}
          </span>
          <span className="mono-label tnum shrink-0 normal-case tracking-normal text-tertiary">
            {confidenceLabel(stakeholder.confidence)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-border pt-1.5 pl-1.5">
          <span className="mono-label truncate normal-case tracking-normal text-tertiary">
            {ENGAGEMENT_LABEL[stakeholder.engagement ?? ""] ?? "Unworked"}
          </span>
          <span className="h-1.5 w-1.5 bg-accent" />
        </div>
      </button>
    );
  };

  const slotById = (id: string) => slots.find((slot) => slot.id === id);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden border border-border bg-bg">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-2.5">
        <div>
          <p className="mono-label text-secondary">Committee map</p>
          <p className="text-[11px] text-tertiary">Verified people only, gaps stay unnamed.</p>
        </div>
        <span className="mono-label tnum text-tertiary">{String(stakeholders.length).padStart(2, "0")} mapped</span>
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="committeeAccent" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <line x1="50" y1="19" x2="50" y2="83" stroke="rgba(255,255,255,0.05)" strokeWidth="0.35" />
        <line x1="12" y1="47" x2="88" y2="47" stroke="rgba(255,255,255,0.05)" strokeWidth="0.35" />
        <path d="M 25 38 C 38 38, 39 48, 50 48 C 61 48, 62 38, 75 38" fill="none" stroke="url(#committeeAccent)" strokeWidth="0.65" />
        <path d="M 25 73 C 39 73, 39 54, 50 54 C 61 54, 62 73, 75 73" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.45" strokeDasharray="1.5 1.5" />
      </svg>

      <div className="absolute inset-x-3 bottom-14 top-[64px] z-20 grid grid-cols-2 grid-rows-2 gap-2 sm:inset-x-4 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)] sm:gap-3">
        <div className="min-w-0">{slotById("champion") && renderCard(slotById("champion")!)}</div>
        <div className="row-span-2 hidden items-center justify-center sm:flex">
          <div className="flex h-24 w-[120px] flex-col items-center justify-center border border-accent/30 bg-surface/95 text-center shadow-cell">
            <span className="flex h-7 w-7 items-center justify-center border border-accent/40 text-accent-soft">
              <ArrowRight size={15} strokeWidth={2.2} />
            </span>
            <span className="mono-label mt-2 text-accent-soft">Quorum path</span>
            <span className="mt-0.5 text-[10px] leading-tight text-tertiary">next best route</span>
          </div>
        </div>
        <div className="min-w-0">{slotById("buyer") && renderCard(slotById("buyer")!)}</div>
        <div className="min-w-0">{slotById("support") && renderCard(slotById("support")!)}</div>
        <div className="min-w-0">{slotById("technical") && renderCard(slotById("technical")!)}</div>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-20 border border-border bg-bg/90 p-2">
        <div className="flex items-center justify-between gap-3">
          <span className="mono-label shrink-0">Gaps</span>
          <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
            {remaining.length > 0 && (
              <span className="border border-border-strong px-1.5 py-1 text-[10px] text-secondary">
                +{remaining.length} more mapped
              </span>
            )}
            {missingRoles.length ? (
              missingRoles.map((gap) => (
                <span key={gap} className="border border-dashed border-border-strong px-1.5 py-1 text-[10px] text-tertiary">
                  {gapLabel(gap)}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-good">Core buying path covered</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
