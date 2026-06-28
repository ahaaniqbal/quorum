import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY as string | undefined;
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID as string | undefined;

export function hasVapiKey(): boolean {
  return Boolean(PUBLIC_KEY && PUBLIC_KEY.length > 4);
}

type StartArgs = {
  contactId: Id<"contacts">;
  conversationId: Id<"conversations">;
  onTranscript: (role: "rep" | "prospect", text: string) => void;
  onLive?: () => void;
  onEnd: () => void;
  onError?: (message: string) => void;
};

// Single active call at a time. Kept module-level so the deal room can stop it
// (End button / navigating away) without threading the instance through React.
let activeVapi: any = null;

export function stopActiveVapiCall(): void {
  try {
    activeVapi?.stop?.();
  } catch {
    /* ignore */
  }
  activeVapi = null;
}

// Starts a real in-browser Vapi voice call. The Vapi Web SDK emits transcript
// events client-side, so we push them straight into Convex; no webhook needed.
// Dynamically imported so the bundle/build never depends on the package when
// no key is configured.
export async function startRealVapiCall(args: StartArgs): Promise<void> {
  if (!hasVapiKey()) throw new Error("No Vapi public key");

  const mod = await import("@vapi-ai/web").catch(() => null);
  if (!mod) throw new Error("@vapi-ai/web not installed");
  const Vapi = mod.default;
  const vapi = new Vapi(PUBLIC_KEY!);
  activeVapi = vapi;

  vapi.on("message", (msg: any) => {
    if (msg?.type === "transcript" && msg?.transcriptType === "final") {
      const role = msg.role === "assistant" ? "rep" : "prospect";
      if (msg.transcript?.trim()) args.onTranscript(role, msg.transcript.trim());
    }
  });

  vapi.on("call-start", () => args.onLive?.());

  vapi.on("error", (e: any) => {
    if (activeVapi === vapi) activeVapi = null;
    args.onError?.(typeof e === "string" ? e : (e?.message ?? "Voice call error"));
    args.onEnd();
  });

  vapi.on("call-end", async () => {
    if (activeVapi === vapi) activeVapi = null;
    try {
      await convex.action(api.voice.finalizeRealCall, {
        conversationId: args.conversationId,
      });
    } finally {
      args.onEnd();
    }
  });

  if (ASSISTANT_ID) {
    vapi.start(ASSISTANT_ID);
  } else {
    const cfg: any = await convex.query(api.voice.getAssistantConfig, {
      contactId: args.contactId,
    });
    vapi.start(cfg?.assistant ?? {});
  }
}
