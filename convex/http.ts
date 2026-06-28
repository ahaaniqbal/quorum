import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

// Inbound lead webhook. Point a form (Typeform/HubSpot), a CRM, a Zapier step,
// or an email-forwarding rule at:
//   POST https://<deployment>.convex.site/inbound?token=<workspace token>
//   { "email": "lead@company.com", "name"?: "...", "company"?: "..." }
// Quorum resolves the workspace from the token and works the lead autonomously.
const inbound = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-quorum-token") ?? "";
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* tolerate empty / non-JSON bodies */
  }
  const email = String(body.email ?? body.from ?? body.sender ?? "").trim().toLowerCase();

  if (!token) return json({ ok: false, error: "missing token" }, 401);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ ok: false, error: "valid email required" }, 400);

  const userId = await ctx.runQuery(internal.inbound.resolveToken, { token });
  if (!userId) return json({ ok: false, error: "invalid token" }, 401);

  await ctx.scheduler.runAfter(0, internal.inbound.workLead, { userId, email });
  return json({ ok: true, queued: 1, email });
});

http.route({ path: "/inbound", method: "POST", handler: inbound });

export default http;
