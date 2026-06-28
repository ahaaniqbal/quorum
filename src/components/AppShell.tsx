import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  CheckCircle2,
  Home as HomeIcon,
  LayoutDashboard,
  PlugZap,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import Sidebar from "./Sidebar";
import AskQuorum from "./AskQuorum";
import ReactiveGrid from "./ReactiveGrid";

export default function AppShell() {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden">
      <ReactiveGrid />
      <div className="hidden md:block">
        <Sidebar onAskQuorum={() => setAskOpen(true)} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pb-[58px] md:pb-0">
        <Outlet context={{ openAskQuorum: () => setAskOpen(true) }} />
      </div>
      <MobileNav onAskQuorum={() => setAskOpen(true)} />
      <AskQuorum open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}

// Mobile has no sidebar, so the bottom bar must reach the essential surfaces.
// Setup is omitted here (it is a one-time checklist reachable from Home and
// Integrations) so Settings has a home on mobile. Labels match the sidebar.
const MOBILE_NAV = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/pipeline", label: "Pipeline", icon: LayoutDashboard },
  { to: "/review", label: "Review", icon: CheckCircle2 },
  { to: "/integrations", label: "Integrations", icon: PlugZap },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function MobileNav({ onAskQuorum }: { onAskQuorum: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[58px] grid-cols-6 border-t border-border bg-[#0b0b0a] md:hidden">
      {MOBILE_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 border-r border-border text-[10px] transition-colors ${
                isActive ? "bg-surface2 text-text" : "text-tertiary hover:bg-surface hover:text-secondary"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-0 h-0.5 w-full bg-accent" />}
                <Icon
                  size={15}
                  strokeWidth={2}
                  className={isActive ? "text-accent-soft" : "text-tertiary"}
                />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onAskQuorum}
        className="relative flex flex-col items-center justify-center gap-0.5 text-[10px] text-accent-soft transition-colors hover:bg-surface"
      >
        <Sparkles size={15} strokeWidth={2} />
        <span>Ask</span>
      </button>
    </nav>
  );
}
