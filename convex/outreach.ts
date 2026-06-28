import { action, mutation, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

type Contact = {
  _id: string;
  name: string;
  title?: string;
  role: string;
  persona?: string;
  isPrimary: boolean;
  enrichment?: any;
};

type Seller = {
  name?: string;
  companyName?: string;
  product?: string;
  valueProp?: string;
} | null;

// Persona-tuned templated email: deterministic fallback. Sells the seller's
// product (from their profile), not a hardcoded one.
function templateDraft(
  contact: Contact,
  companyName: string,
  signal: string,
  callOutcome: string,
  seller: Seller
): { subject: string; body: string } {
  const first = contact.name.split(" ")[0];
  const co = seller?.companyName ?? "our team";
  const product = seller?.product ?? "our platform";
  const value = seller?.valueProp ? ` ${seller.valueProp}.` : "";
  const angle: Record<string, { subject: string; hook: string; close: string }> = {
    economic_buyer: {
      subject: `${companyName}: quick ROI on a ${co} pilot`,
      hook: `Your team just ${signal.toLowerCase()}, which is exactly when ${product} pays off.${value} Most teams see payback inside a quarter.`,
      close: `Worth 20 minutes to walk through the economics?`,
    },
    technical: {
      subject: `${co} × ${companyName}: integration & security overview`,
      hook: `${product} fits cleanly into your existing stack: no rip-and-replace, scoped access, and a clean API.${value}`,
      close: `Happy to send the security overview and an integration diagram. Want me to?`,
    },
    user: {
      subject: `Helping the ${companyName} team with ${product}`,
      hook: `${product} is built for teams like yours.${value} Rollout is light. Most teams are live in days.`,
      close: `Open to a quick look at how it'd fit your workflow?`,
    },
    champion: {
      subject: `Following up: ${companyName} + ${co}`,
      hook: `Great talking things through. ${product} is exactly the leverage we discussed.${value}`,
      close: `I'll bring a tailored pilot plan to our next call.`,
    },
  };
  const a = angle[contact.role] ?? angle.user;
  const body = `Hi ${first},\n\n${a.hook}\n\nContext from our side: ${callOutcome}\n\n${a.close}\n\n${seller?.name ?? "The team"}${seller?.companyName ? `, ${seller.companyName}` : ""}`;
  return { subject: a.subject, body };
}

async function openAIDraft(
  key: string,
  contact: Contact,
  companyName: string,
  signal: string,
  callOutcome: string,
  seller: Seller
): Promise<{ subject: string; body: string } | null> {
  try {
    const sellerCo = seller?.companyName ?? "the seller";
    const product = seller?.product ?? "a B2B product";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are ${seller?.name ?? "an account executive"} at ${sellerCo}, selling ${product}${seller?.valueProp ? ` (${seller.valueProp})` : ""}. Write a short, persona-tuned outreach email (max 110 words) to a member of the prospect's buying committee. Return JSON {"subject":"","body":""}. Concrete value tied to their company, one clear ask, no fluff. Sign off as ${seller?.name ?? "the team"} from ${sellerCo}.`,
          },
          {
            role: "user",
            content: `Prospect company: ${companyName}. Signal: ${signal}. Recipient: ${contact.name}, ${contact.title} (committee role: ${contact.role}). Persona: ${contact.persona}. Outcome of our call with their colleague: ${callOutcome}.`,
          },
        ],
      }),
    });
    const j: any = await res.json();
    const parsed = JSON.parse(j.choices[0].message.content);
    if (parsed.subject && parsed.body) return parsed;
    return null;
  } catch {
    return null;
  }
}

export const generateOutreach = action({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<number> => {
    const access: any = await ctx.runQuery(internal.authz.assertAccountAccess, { accountId });
    const runId: string = await ctx.runMutation(internal.agentTrace.startRun, {
      accountId,
      userId: access.userId ?? undefined,
      trigger: "manual",
      goal: `Draft review-gated outreach for ${access.account.companyName}`,
    });
    try {
      const drafted = await ctx.runAction(internal.outreach.generateOutreachAutonomous, { accountId });
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId: runId as any,
        accountId,
        agent: "outreach",
        type: "draft",
        status: drafted > 0 ? "completed" : "blocked",
        label: drafted > 0 ? "Outreach drafts generated" : "Outreach paused",
        detail:
          drafted > 0
            ? "Quorum generated persona-tuned drafts and held them for human review before send."
            : "Quorum did not draft because no verified committee members were available.",
        tool: process.env.OPENAI_API_KEY ? "OpenAI draft agent" : "deterministic draft agent",
        output: { drafted, reviewGate: true },
      });
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: drafted > 0 ? "completed" : "blocked",
        summary:
          drafted > 0
            ? `Generated ${drafted} review-gated draft${drafted === 1 ? "" : "s"} for ${access.account.companyName}.`
            : `Paused outreach for ${access.account.companyName}; no verified committee members were safe to contact.`,
      });
      return drafted;
    } catch (error: any) {
      await ctx.runMutation(internal.agentTrace.recordStep, {
        runId: runId as any,
        accountId,
        agent: "outreach",
        type: "draft",
        status: "failed",
        label: "Outreach generation failed",
        detail: error?.message ?? "Unknown outreach generation error.",
        error: error?.message ?? "Unknown error",
      });
      await ctx.runMutation(internal.agentTrace.completeRun, {
        runId: runId as any,
        status: "failed",
        summary: `Outreach generation failed for ${access.account.companyName}.`,
      });
      throw error;
    }
  },
});

export const generateOutreachAutonomous = internalAction({
  args: { accountId: v.id("accounts") },
  handler: async (ctx, { accountId }): Promise<number> => {
    // Unguarded load (see committee.mapCommittee) so autonomous ingestion can
    // draft outreach with no auth context.
    const data: any = await ctx.runQuery(internal.brain.getBrainData, { accountId });
    if (!data) return 0;
    const account = data.account;
    const seller: Seller = data.seller ?? null;
    const signal: string =
      account.enrichment?.signals?.[0] ?? "is scaling its GTM team";
    const callOutcome: string =
      data.latestConversation?.summary ??
      "We qualified your colleague on a live call and booked a follow-up. Strong fit on speed-to-lead and multi-threading.";

    const committee: Contact[] = data.contacts.filter((c: Contact) => !c.isPrimary);
    if (committee.length === 0) return 0;

    const key = process.env.OPENAI_API_KEY;

    // Fan out generation concurrently (Workpool-style parallelism).
    const drafts = await Promise.all(
      committee.map(async (c) => {
        let draft = key
          ? await openAIDraft(key, c, account.companyName, signal, callOutcome, seller)
          : null;
        if (!draft) draft = templateDraft(c, account.companyName, signal, callOutcome, seller);
        return { contact: c, draft };
      })
    );

    for (const { contact, draft } of drafts) {
      const confidence =
        (contact.enrichment?.linkedin ? 8 : 0) +
        (data.latestConversation?.summary ? 8 : 0) +
        (account.enrichment?.source === "fiber" ? 10 : account.enrichment?.source === "derived" ? -10 : 2) +
        70;
      await ctx.runMutation(api.outreach.saveDraft, {
        accountId,
        contactId: contact._id as any,
        subject: draft.subject,
        body: draft.body,
        persona: contact.role,
        contactName: contact.name,
        contactTitle: contact.title ?? "",
        confidence: Math.max(45, Math.min(94, confidence)),
        rationale: {
          signal,
          callOutcome,
          source: key ? "openai" : "template",
          safeguards: [
            "Draft is held for human approval.",
            "Persona and buying role are visible before send.",
            "Approved email only sends after AgentMail is connected.",
          ],
        },
      });
    }

    await ctx.runMutation(api.mutations.recordEvent, {
      accountId,
      type: "outreach_drafted",
      label: `Persona-tuned outreach drafted for ${committee.length} committee members`,
    });

    return committee.length;
  },
});

// Save a draft + flip the contact to "contacted" + log a per-member event.
export const saveDraft = mutation({
  args: {
    accountId: v.id("accounts"),
    contactId: v.id("contacts"),
    subject: v.string(),
    body: v.string(),
    persona: v.string(),
    contactName: v.string(),
    contactTitle: v.string(),
    confidence: v.optional(v.number()),
    rationale: v.optional(v.any()),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("drafts", {
      accountId: a.accountId,
      contactId: a.contactId,
      subject: a.subject,
      body: a.body,
      persona: a.persona,
      status: "draft",
      confidence: a.confidence,
      rationale: a.rationale,
    });
    await ctx.db.patch(a.contactId, { status: "contacted" });
    await ctx.db.insert("events", {
      accountId: a.accountId,
      type: "outreach_drafted",
      label: `Drafted outreach to ${a.contactName}${
        a.contactTitle ? ` (${a.contactTitle})` : ""
      }`,
    });
  },
});
