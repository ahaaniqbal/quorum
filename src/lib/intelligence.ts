function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sourceConfidence(source?: string) {
  if (source === "fiber") return 90;
  if (source === "curated") return 84;
  if (source === "derived") return 58;
  return 64;
}

function sourceLabel(source?: string) {
  if (source === "fiber") return "Fiber company enrichment";
  if (source === "curated") return "Curated demo profile";
  if (source === "derived") return "Domain-derived company profile";
  return "Company enrichment";
}

export function buildClientIntelligence(data: any) {
  const account = data?.account;
  if (!account) return null;
  const contacts = data.contacts ?? [];
  const drafts = data.drafts ?? [];
  const actions = data.actions ?? [];
  const enrichment = account.enrichment ?? {};
  const committee = contacts.filter((contact: any) => !contact.isPrimary);
  const primary = contacts.find((contact: any) => contact.isPrimary);
  const sources: any[] = [
    {
      label: sourceLabel(enrichment.source),
      type: "company",
      status: enrichment.source === "derived" ? "inferred" : "verified",
      confidence: sourceConfidence(enrichment.source),
      detail: [enrichment.funding, enrichment.headcount && `${enrichment.headcount} employees`, enrichment.industry]
        .filter(Boolean)
        .join(" · "),
    },
  ];

  for (const source of enrichment.sources ?? []) {
    sources.push({
      label: String(source),
      type: "company",
      status: "verified",
      confidence: source === "Orange Slice" ? 82 : 88,
      detail: source === "Orange Slice" ? "LinkedIn company snapshot." : "External company signal.",
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

  if (account.graph?.stakeholders?.length) {
    sources.push({
      label: "Committee graph",
      type: "ai",
      status: "inferred",
      confidence: account.graph.confidence ?? (committee.length >= 3 ? 78 : 66),
      detail: `${account.graph.stakeholders.length} stakeholders modeled.`,
    });
  }

  const gaps: any[] = [];
  if (!enrichment.source || enrichment.source === "derived") {
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

  const sourceAverage =
    sources.reduce((sum, source) => sum + source.confidence, 0) / Math.max(1, sources.length);
  const coverageBonus = Math.min(14, committee.length * 3 + drafts.length * 2);
  const riskPenalty = gaps.reduce(
    (sum, gap) => sum + (gap.severity === "high" ? 12 : gap.severity === "medium" ? 7 : 3),
    0
  );
  const score = clamp(sourceAverage + coverageBonus - riskPenalty);

  return {
    score,
    grade: score >= 82 ? "high confidence" : score >= 65 ? "review recommended" : "needs verification",
    sources: sources.slice(0, 8),
    gaps: gaps.slice(0, 5),
    risks: actions
      .filter((action: any) => ["failed", "skipped", "pending"].includes(action.status))
      .map((action: any) => ({
        label: `${String(action.type).toUpperCase()} not closed`,
        detail: action.audit?.lastError ?? action.label,
        severity: action.status === "failed" ? "high" : "medium",
      }))
      .slice(0, 5),
    checklist: [
      { label: "Company source", done: enrichment.source && enrichment.source !== "derived" },
      { label: "Primary verified", done: Boolean(primary?.enrichment?.linkedin) },
      { label: "Committee mapped", done: committee.length >= 3 },
      { label: "Drafts ready", done: drafts.length > 0 },
      { label: "Actions connected", done: actions.some((action: any) => action.status === "done") },
    ],
  };
}
