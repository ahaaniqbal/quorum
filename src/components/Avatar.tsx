import { useState } from "react";
import { initials } from "../lib/format";

// Real images only. If we do not have a verified person photo, show initials
// instead of a synthetic face that could imply the wrong identity.
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
  void email;
  const sources = [photoUrl].filter(Boolean) as string[];
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
