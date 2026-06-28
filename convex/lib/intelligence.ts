type EvidenceSource = {
  label: string;
  type: "company" | "person" | "conversation" | "ai" | "action";
  status: "verified" | "inferred" | "missing" | "blocked";
  confidence: number;
  detail: string;
};

type IntelligenceClaim = {
  label: string;
  detail: string;
  confidence: number;
};

type IntelligenceGap = {
  label: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function sourceConfidence(source: string | undefined) {
  if (source === "fiber") return 90;
  if (source === "curated") return 84;
  if (source === "derived") return 58;
  return 64;
}

function sourceLabel(source: string | undefined) {
  if (source === "fiber") return "Fiber company enrichment";
  if (source === "curated") return "Curated demo profile";
  if (source === "derived") return "Domain-derived company profile";
  return "Company enrichment";
}

export function buildAccountIntelligence({
  account,
  contacts,
  latestConversation,
  drafts,
  actions,
}: {
  account: any;
  contacts: any[];
  latestConversation?: any;
  drafts: any[];
  actions: any[];
}) {
  const enrichment = account?.enrichment ?? {};
  const committee = contacts.filter((contact) => !contact.isPrimary);
  const primary = contacts.find((contact) => contact.isPrimary);
  const sources: EvidenceSource[] = [];
  const claims: IntelligenceClaim[] = [];
  const gaps: IntelligenceGap[] = [];
  const risks: IntelligenceGap[] = [];

  sources.push({
    label: sourceLabel(enrichment.source),
    type: "company",
    status: enrichment.source === "derived" ? "inferred" : "verified",
    confidence: sourceConfidence(enrichment.source),
    detail: [
      enrichment.funding,
      enrichment.headcount && `${enrichment.headcount} employees`,
      enrichment.industry,
    ]
      .filter(Boolean)
      .join(" · "),
  });

  for (const source of enrichment.sources ?? []) {
    sources.push({
      label: String(source),
      type: "company",
      status: "verified",
      confidence: source === "Orange Slice" ? 82 : 88,
      detail: source === "Orange Slice" ? "LinkedIn company snapshot and social proof." : "External company or people signal.",
    });
  }

  if (primary) {
    sources.push({
      label: primary.enrichment?.linkedin ? "Verified primary contact" : "Primary contact",
      type: "person",
      status: primary.enrichment?.linkedin ? "verified" : "inferred",
      confidence: primary.enrichment?.linkedin ? 88 : 68,
      detail: `${primary.name}${primary.title ? `, ${primary.title}` : ""}`,
    });
  }

  if (latestConversation?.summary) {
    sources.push({
      label: "Live conversation summary",
      type: "conversation",
      status: "verified",
      confidence: 86,
      detail: latestConversation.summary,
    });
  }

  if (account.graph?.stakeholders?.length) {
    sources.push({
      label: "Committee graph",
      type: "ai",
      status: "inferred",
      confidence: account.graph.confidence ?? (committee.length >= 3 ? 78 : 66),
      detail: `${account.graph.stakeholders.length} stakeholder${account.graph.stakeholders.length === 1 ? "" : "s"} modeled.`,
    });
  }

  if (account.moves?.top_move) {
    sources.push({
      label: "Next-move engine",
      type: "ai",
      status: "inferred",
      confidence: account.moves.confidence ?? 74,
      detail: account.moves.top_move.action ?? account.moves.top_move.name ?? "Recommended next action.",
    });
  }

  for (const action of actions) {
    sources.push({
      label: `${String(action.type).toUpperCase()} action`,
      type: "action",
      status: action.status === "done" ? "verified" : action.status === "skipped" ? "blocked" : "inferred",
      confidence: action.confidence ?? (action.status === "done" ? 92 : action.status === "skipped" ? 45 : 70),
      detail: action.label,
    });
  }

  if (hasValue(enrichment.funding)) {
    claims.push({
      label: "Company stage",
      detail: `${account.companyName} is modeled as ${enrichment.funding}.`,
      confidence: sourceConfidence(enrichment.source),
    });
  }
  if (hasValue(enrichment.headcount)) {
    claims.push({
      label: "Team size",
      detail: `${enrichment.headcount} employees.`,
      confidence: sourceConfidence(enrichment.source),
    });
  }
  if (committee.length) {
    claims.push({
      label: "Buying committee",
      detail: `${committee.length} non-primary stakeholder${committee.length === 1 ? "" : "s"} identified.`,
      confidence: committee.some((contact) => contact.enrichment?.linkedin) ? 82 : 68,
    });
  }
  if (drafts.length) {
    claims.push({
      label: "Persona coverage",
      detail: `${drafts.length} customer-facing draft${drafts.length === 1 ? "" : "s"} generated for review.`,
      confidence: 76,
    });
  }

  if (!hasValue(enrichment.source) || enrichment.source === "derived") {
    gaps.push({
      label: "Weak company source",
      detail: "Company profile is derived from the domain. Verify before high-stakes outreach.",
      severity: "high",
    });
  }
  if (!primary?.enrichment?.linkedin) {
    gaps.push({
      label: "Primary contact not externally verified",
      detail: "Use review gate until the contact identity is confirmed.",
      severity: "medium",
    });
  }
  if (committee.length < 3) {
    gaps.push({
      label: "Committee coverage thin",
      detail: "Map at least three buying roles before assuming the account is fully worked.",
      severity: "medium",
    });
  }
  if (!latestConversation?.summary) {
    gaps.push({
      label: "No live qualification yet",
      detail: "The brain is operating from enrichment and committee signals only.",
      severity: "low",
    });
  }

  for (const action of actions) {
    if (["failed", "skipped", "pending"].includes(action.status)) {
      risks.push({
        label: `${String(action.type).toUpperCase()} not closed`,
        detail: action.audit?.lastError ?? action.requirements?.join(", ") ?? action.label,
        severity: action.status === "failed" ? "high" : "medium",
      });
    }
  }

  const sourceAverage = sources.length
    ? sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length
    : 45;
  const coverageBonus = Math.min(14, committee.length * 3 + drafts.length * 2);
  const riskPenalty = gaps.reduce((sum, gap) => sum + (gap.severity === "high" ? 12 : gap.severity === "medium" ? 7 : 3), 0);
  const score = clamp(sourceAverage + coverageBonus - riskPenalty);

  return {
    score,
    grade: score >= 82 ? "high confidence" : score >= 65 ? "review recommended" : "needs verification",
    sources: sources.slice(0, 8),
    claims: claims.slice(0, 5),
    gaps: gaps.slice(0, 5),
    risks: risks.slice(0, 5),
    checklist: [
      { label: "Company source", done: Boolean(enrichment.source && enrichment.source !== "derived") },
      { label: "Primary verified", done: Boolean(primary?.enrichment?.linkedin) },
      { label: "Committee mapped", done: committee.length >= 3 },
      { label: "Drafts ready", done: drafts.length > 0 },
      { label: "Actions connected", done: actions.some((action) => action.status === "done") },
    ],
  };
}
