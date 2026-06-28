import { Routes, Route } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import AppShell from "./AppShell";
import Splash from "./Splash";
import Pipeline from "../pages/Pipeline";
import Dashboard from "../pages/Dashboard";
import Integrations from "../pages/Integrations";
import Settings from "../pages/Settings";
import Onboarding from "../pages/Onboarding";

export default function AuthedApp() {
  const me = useQuery(api.profiles.getMyProfile);

  if (me === undefined) return <Splash />;

  if (!me?.profile?.onboarded) {
    const fallback = me?.user?.name ?? me?.user?.email?.split("@")[0];
    return <Onboarding defaultName={fallback ?? undefined} />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Pipeline />} />
        <Route path="/deal/:accountId" element={<Dashboard />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Pipeline />} />
      </Route>
    </Routes>
  );
}
