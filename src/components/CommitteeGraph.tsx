import { Avatar } from "./Avatar";

// Renders the buying-committee graph: stakeholders as nodes (colored by
// engagement, economic buyer unmistakable), relationships as edges, and gaps as
// ghost nodes labeled by role. HTML nodes positioned over an SVG edge layer.

const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic buyer",
  technical_approver: "Technical",
  user: "User",
  influencer: "Influencer",
  blocker: "Blocker",
  unknown: "Stakeholder",
};

const ENGAGE_RING: Record<string, string> = {
  engaged: "#3FB950",
  contacted: "#8472f3",
  dark: "#F85149",
  not_contacted: "#6e6e6e",
};

function gapLabel(gap: string): string {
  const m = gap.match(
    /\b(security|IT|finance|cfo|legal|procurement|revops|revenue operations|engineering|technical|champion|economic buyer|data|compliance|it\/security)\b/i
  );
  if (m) return m[0].replace(/\bit\b/i, "IT");
  return gap.split(/[,.]/)[0].slice(0, 20);
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
  const stakeholders: any[] = (graph?.stakeholders ?? []).slice(0, 6);
  const gaps: string[] = (graph?.gaps ?? []).slice(0, 3);
  const rels: any[] = graph?.relationships ?? [];

  // economic buyer first (top), then by influence.
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  const sorted = [...stakeholders].sort((a, b) => {
    if (a.role === "economic_buyer" && b.role !== "economic_buyer") return -1;
    if (b.role === "economic_buyer" && a.role !== "economic_buyer") return 1;
    return (order[a.influence] ?? 3) - (order[b.influence] ?? 3);
  });

  const items = [
    ...sorted.map((s) => ({ kind: "node" as const, data: s })),
    ...gaps.map((g) => ({ kind: "gap" as const, data: g })),
  ];
  const N = items.length;

  const W = 330;
  const H = Math.max(250, 150 + N * 14);
  const cx = W / 2;
  const cy = H / 2;
  const R = N <= 1 ? 0 : Math.min(cx, cy) - 56;

  const pos: Record<string, { x: number; y: number }> = {};
  items.forEach((it, i) => {
    const angle = (-90 + (360 / Math.max(N, 1)) * i) * (Math.PI / 180);
    const id = it.kind === "node" ? it.data.id : `gap-${i}`;
    pos[id] = N === 1 ? { x: cx, y: cy } : { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  const avatarFor = (s: any) => {
    const c = contacts.find(
      (x) => x.email === s.email || x.name?.toLowerCase() === s.name?.toLowerCase()
    );
    return c?.enrichment?.profilePic as string | undefined;
  };

  return (
    <div className="relative mx-auto" style={{ width: W, height: H }}>
      {/* edges */}
      <svg width={W} height={H} className="absolute inset-0">
        {rels.map((r, i) => {
          const a = pos[r.from];
          const b = pos[r.to];
          if (!a || !b) return null;
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          // Only label the signature champion→buyer edge; other edges read from
          // the line alone and labels would collide at the hub.
          const showLabel = r.type === "champions_to";
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={r.type === "champions_to" ? "var(--accent)" : "rgba(255,255,255,0.12)"}
                strokeWidth={r.type === "champions_to" ? 1.5 : 1}
                strokeDasharray={r.type === "blocks" ? "3 3" : undefined}
              />
              {showLabel && (
                <text
                  x={mid.x}
                  y={mid.y - 4}
                  textAnchor="middle"
                  className="fill-accent-soft"
                  style={{ fontSize: 8, fontFamily: "Geist Mono", letterSpacing: 0.3 }}
                >
                  champions
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      {items.map((it, i) => {
        const id = it.kind === "node" ? it.data.id : `gap-${i}`;
        const p = pos[id];
        if (it.kind === "gap") {
          return (
            <div
              key={id}
              title={it.data}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
              style={{ left: p.x, top: p.y, width: 84 }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-tertiary/60 text-tertiary">
                ?
              </div>
              <span className="mono-label max-w-[84px] truncate text-center normal-case tracking-normal text-tertiary">
                {gapLabel(it.data)}
              </span>
            </div>
          );
        }
        const s = it.data;
        const isBuyer = s.role === "economic_buyer";
        const ring = ENGAGE_RING[s.engagement] ?? "#6e6e6e";
        const selected = selectedId && s.email === selectedId;
        return (
          <button
            key={id}
            onClick={() => onSelect(s.email)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: p.x, top: p.y, width: 92 }}
            title={s.rationale}
          >
            <div
              className="relative"
              style={{
                boxShadow: `0 0 0 2px ${ring}${selected ? "" : "99"}`,
                borderRadius: 9999,
              }}
            >
              <Avatar
                photoUrl={avatarFor(s)}
                email={s.email}
                name={s.name}
                size={isBuyer ? 42 : 34}
                className="rounded-full"
              />
              {s.influence === "high" && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-bg"
                  style={{ background: "var(--accent)" }}
                  title="High influence"
                />
              )}
            </div>
            <span className="max-w-[92px] truncate text-[11px] font-medium text-text">
              {s.name}
            </span>
            <span
              className={`mono-label normal-case tracking-normal ${
                isBuyer ? "font-semibold text-good" : "text-tertiary"
              }`}
            >
              {ROLE_LABEL[s.role] ?? s.role}
            </span>
          </button>
        );
      })}
    </div>
  );
}
