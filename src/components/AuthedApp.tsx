import { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import AppShell from "./AppShell";
import Splash from "./Splash";
import Home from "../pages/Home";
import Pipeline from "../pages/Pipeline";
import Dashboard from "../pages/Dashboard";
import Integrations from "../pages/Integrations";
import Review from "../pages/Review";
import Setup from "../pages/Setup";
import Settings from "../pages/Settings";
import Onboarding from "../pages/Onboarding";

export default function AuthedApp() {
  const me = useQuery(api.profiles.getMyProfile);
  const seedDemo = useMutation(api.seedDemo.seedDemo);
  const ensureGuest = useMutation(api.profiles.ensureGuestProfile);
  const seeded = useRef(false);
  const provisioned = useRef(false);

  // Seed demo accounts once so the pipeline is never empty.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    seedDemo({}).catch(() => {});
  }, [seedDemo]);

  // Anonymous guests get a default profile so they skip onboarding.
  const isAnon = (me?.user as any)?.isAnonymous;
  useEffect(() => {
    if (me === undefined) return;
    if (isAnon && !me?.profile && !provisioned.current) {
      provisioned.current = true;
      ensureGuest({}).catch(() => {
        provisioned.current = false;
      });
    }
  }, [me, isAnon, ensureGuest]);

  if (me === undefined) return <Splash />;

  // Guest still being provisioned a profile.
  if (isAnon && !me?.profile) return <Splash />;

  // Real (non-anonymous) users who haven't onboarded yet.
  if (!isAnon && !me?.profile?.onboarded) {
    const fallback = me?.user?.name ?? me?.user?.email?.split("@")[0];
    return (
      <Onboarding defaultName={fallback ?? undefined} defaultEmail={me?.user?.email ?? undefined} />
    );
  }

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={
          <Onboarding
            defaultName={me?.profile?.name ?? me?.user?.name ?? me?.user?.email?.split("@")[0] ?? undefined}
            defaultEmail={me?.user?.email ?? undefined}
            defaultProfile={me?.profile ?? undefined}
          />
        }
      />
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/deal/:accountId" element={<Dashboard />} />
        <Route path="/review" element={<Review />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
