import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

type Contact = {
  _id: string;
  name: string;
  title?: string;
  role: string;
  persona?: string;
  isPrimary: boolean;
};

// Persona-tuned templated email — deterministic, always works (the reliable
// fallback). OpenAI rewrites it with more nuance when a key is present.
function templateDraft(
  contact: Contact,
  companyName: string,
  signal: string,
  callOutcome: string
): { subject: string; body: string } {
  const first = contact.name.split(" ")[0];
  const angle: Record<string, { subject: string; hook: string; close: string }> = {
    economic_buyer: {
      subject: `${companyName} pipeline efficiency — quick ROI on a pilot`,
      hook: `Your team just ${signal.toLowerCase()}, which usually means more inbound than reps can multi-thread. Quorum works the whole committee automatically and compounds rep efficiency — most teams see payback inside a quarter on inbound alone.`,
      close: `Worth 20 minutes to walk through the pilot economics?`,
    },
    technical: {
      subject: `Quorum × ${companyName} — integration & security overview`,
      hook: `Quorum sits on top of your existing CRM and fires into Slack/HubSpot via clean APIs — no rip-and-replace. We're SOC 2 Type II, with scoped data access and full audit logs.`,
      close: `Happy to send the security pack and a short integration diagram — want me to?`,
    },
    user: {
      subject: `Cutting follow-up drop-off for the ${companyName} team`,
      hook: `Quorum handles enrichment, live qualification, and committee follow-up so reps stop losing the room when a thread goes quiet. Rollout is light — most teams are live on inbound in days.`,
      close: `Open to a quick look at how it'd fit your workflow?`,
    },
    champion: {
      subject: `Following up — ${companyName} + Quorum`,
      hook: `Great talking through the multi-threading gap. Quorum maps the full committee and drafts tailored outreach to each stakeholder automatically — exactly the leverage we discussed.`,
      close: `I'll bring a tailored pilot plan to our Thursday call.`,
    },
  };
  const a = angle[contact.role] ?? angle.user;
  const body = `Hi ${first},\n\n${a.hook}\n\nContext from our side: ${callOutcome}\n\n${a.close}\n\n— The Quorum team`;
  return { subject: a.subject, body };
}

async function openAIDraft(
  key: string,
  contact: Contact,
  companyName: string,
  signal: string,
  callOutcome: string
): Promise<{ subject: string; body: string } | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are an elite B2B account executive writing a short, persona-tuned outreach email (max 110 words). Return JSON {"subject":"","body":""}. No fluff, no exclamation overload, concrete value, one clear ask.',
          },
          {
            role: "user",
            content: `Company: ${companyName}. Signal: ${signal}. Recipient: ${contact.name}, ${contact.title} (role: ${contact.role}). Persona: ${contact.persona}. Outcome of our call with their colleague: ${callOutcome}. Sell "Quorum", an AI account executive that works the whole buying committee and never forgets context.`,
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
    const data: any = await ctx.runQuery(api.queries.getAccountFull, { accountId });
    if (!data) return 0;
    const account = data.account;
    const signal: string =
      account.enrichment?.signals?.[0] ?? "is scaling its GTM team";
    const callOutcome: string =
      data.latestConversation?.summary ??
      "We qualified your colleague on a live call and booked a follow-up — strong fit on speed-to-lead and multi-threading.";

    const committee: Contact[] = data.contacts.filter((c: Contact) => !c.isPrimary);
    if (committee.length === 0) return 0;

    const key = process.env.OPENAI_API_KEY;

    // Fan out generation concurrently (Workpool-style parallelism).
    const drafts = await Promise.all(
      committee.map(async (c) => {
        let draft = key
          ? await openAIDraft(key, c, account.companyName, signal, callOutcome)
          : null;
        if (!draft) draft = templateDraft(c, account.companyName, signal, callOutcome);
        return { contact: c, draft };
      })
    );

    for (const { contact, draft } of drafts) {
      await ctx.runMutation(api.outreach.saveDraft, {
        accountId,
        contactId: contact._id as any,
        subject: draft.subject,
        body: draft.body,
        persona: contact.role,
        contactName: contact.name,
        contactTitle: contact.title ?? "",
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
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("drafts", {
      accountId: a.accountId,
      contactId: a.contactId,
      subject: a.subject,
      body: a.body,
      persona: a.persona,
      status: "draft",
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
