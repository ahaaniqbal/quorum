import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { STAGE_INDEX, STAGES } from "../lib/stages";

const STAGE_DOT = [
  "bg-tertiary",
  "bg-accent",
  "bg-accent",
  "bg-sky-400",
  "bg-good",
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const reset = useMutation(api.admin.resetDemo);

  return (
    <aside className="flex h-screen w-[228px] shrink-0 flex-col border-r border-border bg-[#0c0c0c]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded border border-border">
          <div
            className="h-3 w-3 rounded-full border-[1.5px]"
            style={{ borderColor: "var(--accent)" }}
          />
        </div>
        <span className="text-[14px] font-semibold tracking-tight">Quorum</span>
        <span className="mono-label ml-auto text-tertiary">v1.0</span>
      </div>

      {/* Primary nav */}
      <nav className="px-2.5">
        <NavItem to="/" label="Pipeline" icon="▦" end />
        <NavItem to="/integrations" label="Integrations" icon="⚯" />
      </nav>

      {/* Accounts switcher */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="mono-label">Accounts</span>
          <span className="mono-label tnum text-tertiary">
            {String(pipeline.length).padStart(2, "0")}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5">
          {pipeline.map((a: any) => {
            const active = accountId === a._id;
            return (
              <button
                key={a._id}
                onClick={() => navigate(`/deal/${a._id}`)}
                className={`group mb-0.5 flex w-full items-center gap-2.5 rounded px-2 py-2 text-left transition-colors duration-150 ${
                  active ? "bg-surface2" : "hover:bg-surface"
                }`}
              >
                <Logo url={a.logoUrl} name={a.companyName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-text">
                    {a.companyName}
                  </p>
                  <p className="mono-label truncate normal-case tracking-normal text-tertiary">
                    {STAGES[STAGE_INDEX[a.stage as keyof typeof STAGE_INDEX] ?? 0].label}
                    {a.score ? ` · ${a.score}` : ""}
                  </p>
                </div>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    STAGE_DOT[STAGE_INDEX[a.stage as keyof typeof STAGE_INDEX] ?? 0]
                  }`}
                />
              </button>
            );
          })}
          {pipeline.length === 0 && (
            <p className="px-2 py-3 text-[12px] text-tertiary">No accounts yet.</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" />
          <span className="mono-label normal-case tracking-normal text-secondary">
            account brain live
          </span>
        </div>
        <button
          onClick={async () => {
            if (confirm("Reset all demo data?")) {
              await reset({});
              navigate("/");
            }
          }}
          className="mono-label w-full rounded border border-border px-2 py-1.5 normal-case tracking-normal text-tertiary transition-colors hover:border-border-strong hover:text-secondary"
        >
          reset demo
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  label,
  icon,
  end,
}: {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors duration-150 ${
          isActive
            ? "bg-surface2 text-text"
            : "text-secondary hover:bg-surface hover:text-text"
        }`
      }
    >
      <span className="font-mono text-[13px] text-tertiary">{icon}</span>
      {label}
    </NavLink>
  );
}

function Logo({ url, name }: { url?: string; name?: string }) {
  if (url) {
    return (
      <img
        src={url}
        className="h-6 w-6 shrink-0 rounded border border-border bg-white object-contain p-0.5"
        alt=""
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
    );
  }
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border font-mono text-[10px] text-secondary">
      {name?.[0] ?? "?"}
    </div>
  );
}
