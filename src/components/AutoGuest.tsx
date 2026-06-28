import { useEffect, useRef } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import Splash from "./Splash";

// A judge opening the app cold should land straight in a working product, no
// sign-in wall. We sign them in as an anonymous guest automatically. Real
// accounts are still available via "Sign in to save" in the sidebar.
export default function AutoGuest() {
  const { signIn } = useAuthActions();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    signIn("anonymous").catch(() => {
      started.current = false;
    });
  }, [signIn]);
  return <Splash />;
}
