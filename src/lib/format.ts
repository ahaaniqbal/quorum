export const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic Buyer",
  technical: "Technical",
  user: "End User",
  unknown: "Unknown",
};

export const ROLE_COLOR: Record<string, string> = {
  champion: "bg-accent/15 text-accent-soft border-accent/30",
  economic_buyer: "bg-good/10 text-good border-good/30",
  technical: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  user: "bg-secondary/10 text-secondary border-border",
  unknown: "bg-secondary/10 text-secondary border-border",
};

export const STATUS_PILL: Record<string, string> = {
  not_contacted: "bg-secondary/10 text-secondary",
  contacted: "bg-warn/15 text-warn",
  engaged: "bg-accent/15 text-accent-soft",
  booked: "bg-good/15 text-good",
};

export const STATUS_LABEL: Record<string, string> = {
  not_contacted: "Not contacted",
  contacted: "Outreach sent",
  engaged: "Engaged",
  booked: "Meeting booked",
};

export const EVENT_DOT: Record<string, string> = {
  enriched: "bg-accent",
  call_started: "bg-good",
  transcript: "bg-secondary",
  call_ended: "bg-good",
  committee_mapped: "bg-accent",
  outreach_drafted: "bg-sky-400",
  action_fired: "bg-warn",
  rethread: "bg-accent",
};

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
