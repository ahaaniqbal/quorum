import { mutation } from "./_generated/server";

// Public demo accounts (userId = null) so every visitor — including a judge who
// just opened the app cold — sees a populated pipeline and can open the fully
// worked hero account ("Try a sample company"). Idempotent.

type EventSeed = { type: string; label: string };

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    // Idempotent: skip if the rich hero demo already exists.
    const ramps = await ctx.db
      .query("accounts")
      .withIndex("by_domain", (q) => q.eq("domain", "ramp.com"))
      .collect();
    if (
      ramps.some(
        (a) =>
          a.userId === undefined &&
          a.summary?.startsWith("Series D fintech") &&
          a.graph?.stakeholders?.length &&
          a.moves?.top_move
      )
    ) {
      return { seeded: false };
    }

    // Self-heal: clear any stale public (userId-less) accounts + their data so
    // the demo is always the correct, rich data.
    const allAccounts = await ctx.db.query("accounts").collect();
    for (const acc of allAccounts.filter((a) => a.userId === undefined)) {
      const convos = await ctx.db
        .query("conversations")
        .withIndex("by_account", (q) => q.eq("accountId", acc._id))
        .collect();
      for (const cv of convos) {
        const lines = await ctx.db
          .query("transcriptLines")
          .withIndex("by_conversation", (q) => q.eq("conversationId", cv._id))
          .collect();
        for (const l of lines) await ctx.db.delete(l._id);
        await ctx.db.delete(cv._id);
      }
      for (const table of ["contacts", "events", "actions", "drafts"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_account", (q) => q.eq("accountId", acc._id))
          .collect();
        for (const r of rows) await ctx.db.delete(r._id);
      }
      await ctx.db.delete(acc._id);
    }

    const now = Date.now();
    const min = (m: number) => now - m * 60_000;

    // ---------- ACCOUNT A — Ramp (hero, fully worked) ----------
    const rampId = await ctx.db.insert("accounts", {
      domain: "ramp.com",
      companyName: "Ramp",
      status: "actioned",
      logoUrl: "https://logo.clearbit.com/ramp.com",
      brandColors: ["#E5FE52", "#1A1A1A"],
      summary:
        "Series D fintech, spend management. ~1,000 employees, scaling go-to-market fast. Strong fit: large outbound motion, committee-driven purchasing.",
      enrichment: {
        industry: "Fintech / Spend Management",
        headcount: "1,000–1,500",
        revenue: "$100M–$250M",
        funding: "Series D",
        hq: "New York, NY",
        founded: 2019,
        techStack: ["Salesforce", "Slack", "Snowflake", "Segment"],
        signals: [
          "Raised a large round in the last 90 days",
          "Hiring 40+ sales roles this quarter",
          "New VP of Revenue started 6 weeks ago",
        ],
        sources: ["Fiber", "Orange Slice"],
        source: "curated",
      },
      memory: {
        account_summary:
          "Ramp has a real speed-to-lead and multi-threading problem as they scale the sales team. Maya is an engaged champion; budget exists but needs CFO David Osei's sign-off. A follow-up is booked for Thursday.",
        deal_facts: {
          pain: ["Reps can't follow up on inbound fast enough", "Deals go single-threaded"],
          budget: "Budget line exists for sales tooling this half",
          timing: "Evaluating this quarter",
          competitors_mentioned: [],
          objections: ["Already use Salesforce and a sequencer"],
          commitments: ["Booked a follow-up working session Thursday 2pm", "We agreed to send a security overview"],
        },
        what_changed: "Maya confirmed budget exists and named the CFO as the approver, then booked Thursday.",
      },
      graph: {
        stakeholders: [
          { id: "economic_buyer-david-osei", name: "David Osei", title: "Chief Financial Officer", email: "david.osei@ramp.com", role: "economic_buyer", seniority: "c_level", engagement: "contacted", influence: "high", confidence: 0.8, rationale: "Owns budget; Maya named him as the required approver." },
          { id: "champion-maya-chen", name: "Maya Chen", title: "Director of Sales", email: "maya.chen@ramp.com", role: "champion", seniority: "director", engagement: "engaged", influence: "high", confidence: 0.9, rationale: "Inbound lead, feels the pain daily, selling internally." },
          { id: "technical_approver-priya-nair", name: "Priya Nair", title: "Head of Revenue Operations", email: "priya.nair@ramp.com", role: "technical_approver", seniority: "director", engagement: "contacted", influence: "medium", confidence: 0.7, rationale: "Owns CRM and workflow; must clear integration fit." },
          { id: "influencer-tomas-rivera", name: "Tomás Rivera", title: "VP of Engineering", email: "tomas.rivera@ramp.com", role: "influencer", seniority: "vp", engagement: "contacted", influence: "medium", confidence: 0.6, rationale: "Security and data review before procurement." },
        ],
        relationships: [
          { from: "champion-maya-chen", to: "economic_buyer-david-osei", type: "champions_to", confidence: 0.8 },
          { from: "technical_approver-priya-nair", to: "economic_buyer-david-osei", type: "reports_to", confidence: 0.6 },
          { from: "influencer-tomas-rivera", to: "economic_buyer-david-osei", type: "influences", confidence: 0.5 },
        ],
        gaps: ["No security/IT stakeholder identified, likely required before procurement at Ramp's size."],
      },
      moves: {
        deal_status: "advancing",
        deal_risk: "David (economic buyer) hasn't engaged directly, and no security stakeholder is identified yet.",
        top_move: { stakeholder_id: "economic_buyer-david-osei", name: "David Osei", action: "Send David the ROI model tied to the 40+ rep hiring plan before Thursday's session.", why: "He owns budget and hasn't engaged directly yet.", channel: "email", urgency: "today" },
        moves: [
          { stakeholder_id: "economic_buyer-david-osei", name: "David Osei", title: "Chief Financial Officer", action: "Send the ROI model tied to the 40+ rep hiring plan before Thursday.", why: "Owns budget, not yet engaged directly.", channel: "email", urgency: "today" },
          { stakeholder_id: "champion-maya-chen", name: "Maya Chen", title: "Director of Sales", action: "Confirm Thursday and ask Maya to bring David and a security contact.", why: "Honor the booked session and widen the thread.", channel: "email", urgency: "now" },
          { stakeholder_id: "technical_approver-priya-nair", name: "Priya Nair", title: "Head of Revenue Operations", action: "Send the Salesforce integration one-pager to pre-clear workflow fit.", why: "She owns CRM and must approve the integration.", channel: "email", urgency: "this_week" },
          { stakeholder_id: "influencer-tomas-rivera", name: "Tomás Rivera", title: "VP of Engineering", action: "Proactively send the security overview to de-risk the eval.", why: "We committed to a security overview on the call.", channel: "email", urgency: "this_week" },
        ],
      },
    });

    const maya = await ctx.db.insert("contacts", {
      accountId: rampId,
      name: "Maya Chen",
      title: "Director of Sales",
      email: "maya.chen@ramp.com",
      role: "champion",
      persona: "Frontline revenue leader, cares about rep productivity and ramp time.",
      status: "booked",
      isPrimary: true,
      enrichment: {},
    });

    const committeeA = [
      {
        name: "David Osei",
        title: "Chief Financial Officer",
        email: "david.osei@ramp.com",
        role: "economic_buyer",
        persona: "Owns budget. Cares about ROI, payback period, and cost per booked meeting.",
        status: "contacted",
      },
      {
        name: "Priya Nair",
        title: "Head of Revenue Operations",
        email: "priya.nair@ramp.com",
        role: "user",
        persona: "Lives in the CRM. Cares about data hygiene, routing, and workflow fit.",
        status: "contacted",
      },
      {
        name: "Tomás Rivera",
        title: "VP of Engineering",
        email: "tomas.rivera@ramp.com",
        role: "technical",
        persona: "Security and data review. Cares about SOC2, data handling, and access scope.",
        status: "contacted",
      },
    ];
    const committeeIds: Record<string, any> = {};
    for (const c of committeeA) {
      committeeIds[c.role] = await ctx.db.insert("contacts", {
        accountId: rampId,
        name: c.name,
        title: c.title,
        email: c.email,
        role: c.role,
        persona: c.persona,
        status: c.status,
        isPrimary: false,
        enrichment: {},
      });
    }

    // Conversation + transcript (post-call)
    const convoA = await ctx.db.insert("conversations", {
      accountId: rampId,
      contactId: maya,
      channel: "voice",
      status: "ended",
      summary:
        "Maya confirmed a real speed-to-lead and multi-threading problem. Budget exists, CFO approval needed. Booked a follow-up for Thursday.",
      qualification: {
        budget: { score: 8, note: "Confirmed budget line for sales tooling this half" },
        authority: { score: 7, note: "Champion, needs CFO sign-off" },
        need: { score: 9, note: "Reps cannot follow up fast enough; deals single-thread" },
        timing: { score: 8, note: "Evaluating this quarter" },
        score: 82,
        booked: true,
      },
    });
    const transcriptA: { role: string; text: string; m: number }[] = [
      { role: "rep", text: "Hi Maya, thanks for raising your hand. I saw Ramp just expanded the sales team. What pushed you to look right now?", m: 12 },
      { role: "prospect", text: "Honestly our reps cannot keep up with inbound. Leads sit for hours and we lose them.", m: 12 },
      { role: "rep", text: "That speed-to-lead gap is exactly what we close. When a lead comes in, we respond in seconds and work the whole account, not just one person.", m: 11 },
      { role: "prospect", text: "We already use Salesforce and a sequencer though. Why add another tool?", m: 11 },
      { role: "rep", text: "Fair. We sit on top of Salesforce, we do not replace it. The difference is we thread the full buying committee and remember every conversation, which a sequencer does not do.", m: 10 },
      { role: "prospect", text: "Okay, that part is interesting. The committee thing is a real pain for us.", m: 10 },
      { role: "rep", text: "Then let me get you 20 minutes with the team to show it on your own pipeline. Does Thursday at 2 work?", m: 9 },
      { role: "prospect", text: "Thursday at 2 works. Send the invite.", m: 9 },
    ];
    for (const t of transcriptA) {
      await ctx.db.insert("transcriptLines", {
        conversationId: convoA,
        role: t.role,
        text: t.text,
        ts: min(t.m),
      });
    }

    // Drafts
    const draftsA = [
      { role: "economic_buyer", persona: "economic_buyer", subject: "Ramp + faster speed-to-lead: the ROI math", body: "Hi David, Maya and I spoke about the inbound follow-up gap on the sales team. For a team hiring 40+ reps this quarter, faster speed-to-lead and automatic committee coverage usually translate to a measurable lift in booked meetings per rep. Happy to share a short payback model on your numbers. Open to 15 minutes this week?" },
      { role: "user", persona: "user", subject: "Sits on top of your Salesforce, no rip-and-replace", body: "Hi Priya, we work alongside your existing Salesforce and routing, not against it. Every conversation and committee contact syncs back as clean records, so your data stays tidy and your reps stop dropping inbound. Worth a quick look at how it maps to your current workflow?" },
      { role: "technical", persona: "technical", subject: "Data handling and access scope, ahead of any eval", body: "Hi Tomás, ahead of a possible eval I wanted to get the security details to you early: SOC2, scoped access, and how we handle conversation data. Happy to send our security overview and answer anything your team needs to clear it." },
    ];
    for (const d of draftsA) {
      await ctx.db.insert("drafts", {
        accountId: rampId,
        contactId: committeeIds[d.role],
        subject: d.subject,
        body: d.body,
        persona: d.persona,
        status: "draft",
      });
    }

    // Actions
    for (const a of [
      { type: "slack", label: "Posted new-deal alert to #revenue" },
      { type: "hubspot", label: "Created deal: Ramp, stage Discovery" },
      { type: "calendar", label: "Sent invite: Thursday 2:00pm with Maya Chen" },
    ]) {
      await ctx.db.insert("actions", {
        accountId: rampId,
        type: a.type,
        status: "done",
        label: a.label,
      });
    }

    // Events (insert oldest→newest so _creationTime ordering reads right)
    const eventsA: EventSeed[] = [
      { type: "enriched", label: "Enriched Ramp in 1.8s: Series D fintech, ~1,000 employees" },
      { type: "call_started", label: "Started live call with Maya Chen, Director of Sales" },
      { type: "call_ended", label: "Call ended. Qualification score 82. Meeting booked for Thursday 2:00pm" },
      { type: "committee_mapped", label: "Mapped the buying committee: found 3 more decision makers" },
      { type: "outreach_drafted", label: "Drafted persona-tuned outreach to the CFO, RevOps lead, and VP Eng" },
      { type: "action_fired", label: "Fired 3 actions: Slack alert, CRM deal, calendar invite" },
    ];
    for (const e of eventsA) await ctx.db.insert("events", { accountId: rampId, ...e });

    // ---------- ACCOUNT B — Notion (committee mapped, no call yet) ----------
    const notionId = await ctx.db.insert("accounts", {
      domain: "notion.so",
      companyName: "Notion",
      status: "committee_mapped",
      logoUrl: "https://logo.clearbit.com/notion.so",
      brandColors: ["#000000", "#FFFFFF"],
      summary: "Productivity SaaS scaling enterprise sales. Committee mapped, awaiting first call.",
      enrichment: {
        industry: "Productivity Software",
        headcount: "800–1,000",
        revenue: "$250M+",
        funding: "Series C",
        hq: "San Francisco, CA",
        techStack: ["Salesforce", "Outreach", "Slack"],
        signals: ["Expanding enterprise sales motion", "Posting RevOps roles"],
        sources: ["Fiber"],
        source: "curated",
      },
    });
    await ctx.db.insert("contacts", {
      accountId: notionId,
      name: "Sam Brooks",
      title: "Enterprise Account Executive",
      email: "sam.brooks@notion.so",
      role: "champion",
      persona: "Closer focused on enterprise deal velocity.",
      status: "contacted",
      isPrimary: true,
      enrichment: {},
    });
    for (const c of [
      { name: "Lena Fischer", title: "Chief Revenue Officer", email: "lena.fischer@notion.so", role: "economic_buyer", persona: "Owns revenue strategy and budget." },
      { name: "Raj Patel", title: "Director of Sales Operations", email: "raj.patel@notion.so", role: "user", persona: "Owns the CRM and tooling stack." },
    ]) {
      await ctx.db.insert("contacts", {
        accountId: notionId,
        ...c,
        status: "not_contacted",
        isPrimary: false,
        enrichment: {},
      });
    }
    for (const e of [
      { type: "enriched", label: "Enriched Notion in 2.1s: productivity SaaS, ~800 employees" },
      { type: "committee_mapped", label: "Mapped the buying committee: found 2 decision makers" },
    ] as EventSeed[])
      await ctx.db.insert("events", { accountId: notionId, ...e });

    // ---------- ACCOUNT C — Vercel (just enriched) ----------
    const vercelId = await ctx.db.insert("accounts", {
      domain: "vercel.com",
      companyName: "Vercel",
      status: "active",
      logoUrl: "https://logo.clearbit.com/vercel.com",
      brandColors: ["#FFFFFF", "#000000"],
      summary: "Developer infrastructure. Just enriched, committee not yet mapped.",
      enrichment: {
        industry: "Developer Infrastructure",
        headcount: "500–700",
        revenue: "$100M+",
        funding: "Series E",
        hq: "San Francisco, CA",
        techStack: ["Salesforce", "Slack"],
        signals: ["Growing self-serve to sales-led motion"],
        sources: ["Fiber"],
        source: "curated",
      },
    });
    await ctx.db.insert("contacts", {
      accountId: vercelId,
      name: "Jordan Lee",
      title: "Head of Growth",
      email: "jordan.lee@vercel.com",
      role: "champion",
      persona: "Owns the self-serve to sales-led transition.",
      status: "not_contacted",
      isPrimary: true,
      enrichment: {},
    });
    await ctx.db.insert("events", {
      accountId: vercelId,
      type: "enriched",
      label: "Enriched Vercel in 1.6s: developer infrastructure, ~600 employees",
    });

    return { seeded: true, hero: rampId };
  },
});
