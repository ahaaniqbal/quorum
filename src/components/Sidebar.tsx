import { useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Activity,
  Building2,
  CheckCircle2,
  ChevronRight,
  Command,
  Home as HomeIcon,
  LayoutDashboard,
  LogIn,
  PlugZap,
  RotateCcw,
  Rocket,
  Search,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { STAGE_INDEX, STAGES } from "../lib/stages";
import { Avatar } from "./Avatar";

const STAGE_DOT = [
  "bg-tertiary",
  "bg-accent",
  "bg-accent",
  "bg-warn",
  "bg-good",
];

const NAV_ITEMS: Array<{
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}> = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/pipeline", label: "Pipeline", icon: LayoutDashboard },
  { to: "/setup", label: "Setup", icon: Rocket },
  { to: "/review", label: "Review", icon: CheckCircle2 },
  { to: "/integrations", label: "Integrations", icon: PlugZap },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar({ onAskQuorum }: { onAskQuorum?: () => void }) {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const pipeline = useQuery(api.queries.listPipeline, {}) ?? [];
  const me = useQuery(api.profiles.getMyProfile);
  const reset = useMutation(api.admin.resetDemo);
  const { signOut } = useAuthActions();
  const isGuest = (me?.user as any)?.isAnonymous;

  return (
    <aside className="flex h-screen w-[236px] shrink-0 flex-col border-r border-border bg-[#0b0b0a]">
      {/* Brand */}
      <div className="flex h-12 items-center border-b border-border px-4">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.28em] text-text">
          QUORUM
        </p>
      </div>

      <div className="border-b border-border px-2 py-2">
        <div className="flex h-8 items-center gap-2 border border-border bg-surface/50 px-2 text-secondary shadow-inner shadow-black/10">
          <Search size={13} strokeWidth={1.8} className="text-tertiary" />
          <span className="flex-1 text-[11px]">Quick find</span>
          <span className="flex items-center gap-1 border border-border bg-[#101010] px-1.5 py-0.5 font-mono text-[10px] text-tertiary">
            <Command size={10} strokeWidth={2} />K
          </span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="border-b border-border px-2 py-1.5">
        <div className="px-1.5 pb-0.5">
          <span className="mono-label text-tertiary">Workspace</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* Accounts switcher */}
      <div className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="flex items-center justify-between px-3 pb-1.5">
          <span className="mono-label">Accounts</span>
          <span className="mono-label tnum text-tertiary">
            {String(pipeline.length).padStart(2, "0")}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {pipeline.map((a: any) => {
            const active = accountId === a._id;
            const stageIndex = STAGE_INDEX[a.stage as keyof typeof STAGE_INDEX] ?? 0;
            return (
              <button
                key={a._id}
                onClick={() => navigate(`/deal/${a._id}`)}
                className={`group relative flex h-7 w-full items-center gap-1.5 border px-2 text-left transition-colors duration-150 ${
                  active
                    ? "border-border-strong bg-surface2 shadow-sm shadow-black/20"
                    : "border-transparent hover:border-border hover:bg-surface/70"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-accent" />
                )}
                <Logo url={a.logoUrl} name={a.companyName} domain={a.domain} />
                <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
                  <p className="truncate text-[11px] font-medium leading-none text-text">
                    {a.companyName}
                  </p>
                  <p className="truncate font-mono text-[10px] normal-case tracking-normal text-tertiary">
                    {STAGES[stageIndex].label}
                    {a.score ? ` · ${a.score}` : ""}
                  </p>
                </div>
                <span
                  className={`h-1.5 w-1.5 shrink-0 ${
                    STAGE_DOT[stageIndex]
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
      <div className="border-t border-border p-2">
        <button
          onClick={onAskQuorum}
          className="mb-2 flex w-full items-center gap-2 border border-accent/30 bg-accent/10 px-2 py-2 text-left transition-colors hover:border-accent/50 hover:bg-accent/15"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-accent/30 bg-accent/15 text-accent-soft">
            <Sparkles size={13} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-text">
              Ask Quorum
            </span>
            <span className="mono-label block truncate normal-case tracking-normal text-accent-soft">
              account copilot
            </span>
          </span>
          <ChevronRight size={14} strokeWidth={1.8} className="text-tertiary" />
        </button>

        <button
          onClick={() => navigate("/setup")}
          className="mb-2 flex w-full items-center gap-2 border border-border bg-surface/50 px-2 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-accent/30 bg-accent/15 text-accent-soft">
            <Rocket size={13} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-text">
              Launch checklist
            </span>
            <span className="mono-label block truncate normal-case tracking-normal text-tertiary">
              onboarding ready
            </span>
          </span>
          <ChevronRight size={14} strokeWidth={1.8} className="text-tertiary" />
        </button>

        {isGuest ? (
          <button
            onClick={() => signOut()}
            className="mb-2 flex w-full items-center gap-2 border border-border px-2 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface"
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center text-white"
              style={{ background: "var(--accent)" }}
            >
              <LogIn size={13} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-text">Guest session</p>
              <p className="mono-label truncate normal-case tracking-normal text-accent-soft">
                Sign in to save →
              </p>
            </div>
          </button>
        ) : (
          me?.profile && (
            <button
              onClick={() => navigate("/settings")}
              className="mb-2.5 flex w-full items-center gap-2.5 px-1.5 py-1.5 text-left transition-colors hover:bg-surface"
            >
              <Avatar
                photoUrl={null}
                email={me.user?.email}
                name={me.profile.name}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-text">{me.profile.name}</p>
                <p className="mono-label truncate normal-case tracking-normal text-tertiary">
                  {me.profile.companyName}
                </p>
              </div>
            </button>
          )
        )}
        <div className="mb-2 flex items-center gap-1.5 px-1 text-secondary">
          <Activity size={13} strokeWidth={1.9} className="text-good" />
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
          className="mono-label flex w-full items-center justify-center gap-1.5 border border-border px-2 py-1.5 normal-case tracking-normal text-tertiary transition-colors hover:border-border-strong hover:bg-surface hover:text-secondary"
        >
          <RotateCcw size={12} strokeWidth={1.8} />
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
  icon: LucideIcon;
  end?: boolean;
}) {
  const Icon = icon;
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `group relative flex h-7 items-center gap-2 border px-2 text-[12px] transition-colors duration-150 ${
          isActive
            ? "border-border-strong bg-surface2 text-text shadow-sm shadow-black/20"
            : "border-transparent text-secondary hover:border-border hover:bg-surface/70 hover:text-text"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-accent" />
          )}
          <span
            className={`flex h-5 w-5 items-center justify-center transition-colors ${
              isActive ? "text-accent-soft" : "text-tertiary group-hover:text-secondary"
            }`}
          >
            <Icon size={13} strokeWidth={1.9} />
          </span>
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Logo({ url, name, domain }: { url?: string; name?: string; domain?: string }) {
  const fallbackUrl = domain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
    : null;
  const [src, setSrc] = useState(url ?? fallbackUrl ?? null);

  if (src) {
    return (
      <img
        src={src}
        className="h-4 w-4 shrink-0 border border-border bg-white object-contain p-0.5"
        alt={name ?? ""}
        onError={() => {
          if (src !== fallbackUrl && fallbackUrl) {
            setSrc(fallbackUrl);
          } else {
            setSrc(null);
          }
        }}
      />
    );
  }
  return (
    <div className="flex h-4 w-4 shrink-0 items-center justify-center border border-border bg-surface text-secondary">
      {name ? (
        <span className="font-mono text-[8px]">{name[0]}</span>
      ) : (
        <Building2 size={10} strokeWidth={1.8} />
      )}
    </div>
  );
}
