import { useState } from "react";
import { initials } from "../lib/format";

// Real images, never generic initials unless the network fails:
// 1) the person's real photo (Fiber LinkedIn profile_pic)
// 2) a deterministic real-face fallback keyed by email/name
// 3) initials block only if both images error
export function Avatar({
  photoUrl,
  email,
  name,
  size = 36,
  className = "",
}: {
  photoUrl?: string | null;
  email?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const seed = encodeURIComponent(email || name || "anon");
  const sources = [photoUrl, `https://i.pravatar.cc/120?u=${seed}`].filter(
    Boolean
  ) as string[];
  const [idx, setIdx] = useState(0);

  const style = { width: size, height: size };

  if (idx >= sources.length) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center border border-border bg-surface2 font-mono text-[11px] text-secondary ${className}`}
      >
        {initials(name ?? "")}
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      onError={() => setIdx((i) => i + 1)}
      alt={name ?? ""}
      style={style}
      className={`shrink-0 border border-border bg-surface2 object-cover ${className}`}
    />
  );
}

// Company logo with the same graceful degradation.
export function OrgLogo({
  url,
  name,
  size = 40,
  className = "",
}: {
  url?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!url || failed) {
    return (
      <div
        style={style}
        className={`flex shrink-0 items-center justify-center border border-border bg-surface font-mono text-sm font-semibold text-secondary ${className}`}
      >
        {name?.[0]?.toUpperCase() ?? "?"}
      </div>
    );
  }
  return (
    <img
      src={url}
      onError={() => setFailed(true)}
      alt={name ?? ""}
      style={style}
      className={`shrink-0 border border-border bg-white object-contain p-1 ${className}`}
    />
  );
}
