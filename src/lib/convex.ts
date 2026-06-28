import { ConvexReactClient } from "convex/react";

const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

if (!url) {
  // Surface a loud, friendly error instead of a cryptic crash.
  console.error(
    "[Quorum] VITE_CONVEX_URL is not set. Run `npx convex dev` and copy the URL into .env.local"
  );
}

export const convex = new ConvexReactClient(url ?? "https://placeholder.convex.cloud");
