// The product has no narrator when a judge uses it alone. This copy is the
// narrator. Voice: plain, specific, confident, no hype, no emojis.
export const copy = {
  pipeline: {
    title: "Pipeline",
    heading: "Accounts",
    newInbound: "drop a work email, Quorum works the whole account.",
    primaryCta: "Run Quorum",
    sampleCta: "Try a sample company",
    sampleHint: "No setup. See the full result on a real company in one click.",
  },

  panels: {
    activity: { title: "Activity", desc: "Every step Quorum takes, live." },
    call: { title: "Live call", desc: "The AI rep qualifies and books, in real time." },
    dealMap: { title: "Buying committee", desc: "Everyone who has to say yes, found automatically." },
    actions: { title: "Actions", desc: "Real work, done across your stack." },
  },

  empty: {
    activity: "Nothing yet. Run a company to watch Quorum work.",
    call: "No call yet. Talk to the AI rep to qualify this account live.",
    dealMap: "Committee not mapped yet. Quorum is finding the decision makers.",
    actions: "No actions fired yet. They run once the deal takes shape.",
  },

  loading: {
    enriching: "Enriching the account…",
    mapping: "Finding the rest of the buying committee…",
    drafting: "Writing outreach for each committee member…",
    acting: "Firing actions across the stack…",
  },

  edge: {
    personalEmail:
      "That looks like a personal email. Quorum works best with a work email — try a sample company below.",
    invalidEmail: "That email doesn't look right. Check it and try again.",
    noData: "Limited data on that company — running the flow with what we have.",
    timeoutFallback: "That took too long, so we loaded sample data to keep things moving.",
    genericError: "Something hiccuped on that step. Quorum kept going with the rest.",
  },

  call: {
    optionalCta: "Talk to the AI rep",
    optionalHint: "Optional. The rest of Quorum runs without it.",
    failed:
      "The live call could not connect. Here is a recorded conversation so you can see how it works.",
  },
};
