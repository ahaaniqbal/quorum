// Scripted qualification call used by the server-streamed simulated voice rep.
// This is both the reliable demo path and the fallback when Vapi keys are absent.
// Each step carries a cumulative qualification snapshot so the scorecard fills
// progressively as lines stream into the dashboard.

export type Qual = {
  budget: { score: number; note: string };
  authority: { score: number; note: string };
  need: { score: number; note: string };
  timing: { score: number; note: string };
  score: number; // overall 0–100
  booked: boolean;
};

export type CallStep = {
  role: "rep" | "prospect";
  text: string;
  gapMs: number; // delay before this line appears
  qual?: Qual; // cumulative snapshot to patch when this line lands
  milestone?: string; // optional activity-feed event label
  booked?: boolean;
};

function overall(q: Omit<Qual, "score" | "booked">): number {
  const avg = (q.budget.score + q.authority.score + q.need.score + q.timing.score) / 4;
  return Math.round(avg * 10);
}

// A short, context-aware call for the re-thread beat: a NEW person from the same
// company arrives, and the rep already knows the account, the prior call, and the
// committee. Proves "one brain, the whole room."
export function buildRethreadScript(ctx: {
  companyName: string;
  newFirst: string;
  priorFirst: string;
  technicalName: string;
  technicalTitle: string;
}): CallStep[] {
  const { companyName, newFirst, priorFirst, technicalName, technicalTitle } = ctx;
  const carried: Qual = {
    budget: { score: 8, note: "Carried from prior call" },
    authority: { score: 9, note: "Owns RevOps rollout" },
    need: { score: 9, note: "Same account need" },
    timing: { score: 9, note: "Joining Thursday pilot" },
    score: 88,
    booked: true,
  };
  return [
    {
      role: "rep",
      text: `Hi ${newFirst} — thanks for reaching out. I see you're at ${companyName}. Funny timing: I was just speaking with ${priorFirst} on your team about scaling GTM, and we've got a pilot call booked for Thursday.`,
      gapMs: 1200,
    },
    {
      role: "prospect",
      text: `Oh — I didn't realize ${priorFirst} had already connected with you.`,
      gapMs: 1700,
    },
    {
      role: "rep",
      text: `We did. Quorum keeps one brain per account, so you're already threaded in — I've got the full context from that call. ${priorFirst} raised budget; I looped in ${technicalName}, your ${technicalTitle}, on the technical review too.`,
      gapMs: 2400,
      milestone: "Rep recalled prior call + committee context from account brain",
    },
    {
      role: "prospect",
      text: `That's exactly what we needed — I own the RevOps rollout. Add me to Thursday.`,
      gapMs: 2000,
      qual: carried,
    },
    {
      role: "rep",
      text: `Done — you're on the invite alongside ${priorFirst}. One thread, the whole team. Talk Thursday, ${newFirst}.`,
      gapMs: 1900,
      qual: { ...carried },
      milestone: `${newFirst} added to the deal — advanced, not restarted`,
      booked: true,
    },
  ];
}

export function buildCallScript(account: {
  companyName: string;
  domain: string;
  enrichment?: any;
  contactName: string;
}): CallStep[] {
  const co = account.companyName;
  const first = account.contactName.split(" ")[0] || "there";
  const funding = account.enrichment?.funding ?? "your recent raise";
  const signal =
    (account.enrichment?.signals && account.enrichment.signals[0]) ??
    "your team scaling GTM";

  // Build cumulative qualification snapshots.
  const q = (
    b: number,
    a: number,
    n: number,
    t: number,
    notes: Partial<Record<"b" | "a" | "n" | "t", string>> = {},
    booked = false
  ): Qual => {
    const base = {
      budget: { score: b, note: notes.b ?? "" },
      authority: { score: a, note: notes.a ?? "" },
      need: { score: n, note: notes.n ?? "" },
      timing: { score: t, note: notes.t ?? "" },
    };
    return { ...base, score: overall(base), booked };
  };

  return [
    {
      role: "rep",
      text: `Hi ${first}, this is the Quorum rep calling — thanks for dropping your email. I saw ${co} is behind ${funding}. Did I catch you at an okay time?`,
      gapMs: 900,
    },
    {
      role: "prospect",
      text: `Yeah, a couple minutes. We are scaling the sales team fast right now, so timing's tight.`,
      gapMs: 1600,
      qual: q(2, 4, 5, 6, {
        n: "Scaling sales team — active pain",
        t: "Hiring now, urgency present",
      }),
    },
    {
      role: "rep",
      text: `Totally — and that's exactly the moment Quorum helps. When you're hiring reps fast, deals go single-threaded and context gets lost. We work the whole buying committee and never drop the thread. What's your biggest bottleneck today?`,
      gapMs: 2200,
    },
    {
      role: "prospect",
      text: `Honestly, speed-to-lead and follow-up. Leads come in, one rep touches them, and if they go quiet we lose the room. We've looked at tools but they're all single-lead.`,
      gapMs: 2400,
      qual: q(4, 5, 8, 6, {
        n: "Speed-to-lead + multi-threading — core need",
        a: "Owns the rep workflow",
      }),
    },
    {
      role: "rep",
      text: `That's the gap we close. Quorum enriches the lead, qualifies on a live call like this one, then maps the rest of the committee and drafts persona-tuned outreach to each of them automatically. One brain across every touch.`,
      gapMs: 2400,
      milestone: "Rep surfaced multi-threading value prop",
    },
    {
      role: "prospect",
      text: `Okay that's interesting. But we just signed an annual on another tool — I'm not sure we have budget to rip and replace this quarter.`,
      gapMs: 2300,
      qual: q(4, 6, 8, 6, {
        b: "Budget objection — existing annual contract",
        a: "Has a seat at the table",
      }),
    },
    {
      role: "rep",
      text: `Fair — and you don't have to rip anything out. Quorum sits on top of your CRM and fires into Slack and HubSpot, so it augments what you have. Most teams start with a pilot on inbound only and expand at renewal. Would a no-risk pilot be worth 20 minutes with your RevOps lead?`,
      gapMs: 2600,
      milestone: "Rep handled budget objection (augment vs replace)",
    },
    {
      role: "prospect",
      text: `Yeah, a pilot I could get behind. I'd want our Head of Eng to sanity-check the integrations though.`,
      gapMs: 2200,
      qual: q(7, 8, 9, 7, {
        b: "Open to pilot — budget unblocked",
        a: "Will pull in technical evaluator",
        n: "Strong fit confirmed",
      }),
    },
    {
      role: "rep",
      text: `Perfect — I'll loop them in too. I've got Thursday at 11, or Friday at 2. Which works for the first call?`,
      gapMs: 2100,
    },
    {
      role: "prospect",
      text: `Let's do Thursday at 11.`,
      gapMs: 1500,
      qual: q(7, 8, 9, 9, {
        t: "Meeting booked Thursday 11am",
      }),
    },
    {
      role: "rep",
      text: `Booked — Thursday 11am. I'll send the invite and bring a tailored pilot plan for ${co}. Talk soon, ${first}.`,
      gapMs: 2000,
      qual: q(8, 8, 9, 9, { t: "Confirmed — invite sending" }, true),
      milestone: "Meeting booked — Thursday 11:00am",
      booked: true,
    },
  ];
}
