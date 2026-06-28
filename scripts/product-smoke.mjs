import { existsSync, readFileSync } from "node:fs";

const checks = [];

function file(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

const requiredAssets = [
  "public/favicon.png",
  "public/quorum-loader.svg",
  "public/quorum-logo.svg",
];

for (const asset of requiredAssets) {
  check(`${asset} exists`, existsSync(new URL(`../${asset}`, import.meta.url)));
}

const closeLoop = file("convex/closeLoop.ts");
check(
  "close-loop server jobs use internal account data",
  closeLoop.includes("internal.closeLoop.getCloseLoopData") &&
    !closeLoop.includes("ctx.runQuery(api.queries.getAccountFull"),
  "internal action jobs must not depend on tenant-guarded public account queries"
);
check(
  "close-loop client entry checks account access",
  closeLoop.includes("requireAccountAccess(ctx, accountId)"),
  "fireActions should not mutate another workspace account"
);

const inbound = file("convex/inbound.ts");
check(
  "inbound webhook uses autonomous committee/outreach engines",
  inbound.includes("internal.committee.mapCommitteeAutonomous") &&
    inbound.includes("internal.outreach.generateOutreachAutonomous"),
  "server-side ingestion has no browser auth context"
);
const schema = file("convex/schema.ts");
const agentTrace = file("convex/agentTrace.ts");
check(
  "autonomous work writes agent run receipts",
  schema.includes("agentRuns: defineTable") &&
    schema.includes("agentSteps: defineTable") &&
    agentTrace.includes("startRun") &&
    agentTrace.includes("recordStep") &&
    inbound.includes("internal.agentTrace.completeRun"),
  "agentic demos need durable proof of what each agent did"
);
check(
  "close-loop actions write agent receipts",
  closeLoop.includes('ctx.db.insert("agentRuns"') &&
    closeLoop.includes('ctx.db.insert("agentSteps"') &&
    closeLoop.includes("internal.agentTrace.recordStep"),
  "approved cross-tool actions should leave an auditable agent trail"
);
const dashboard = file("src/pages/Dashboard.tsx");
const receiptsPanel = file("src/components/AgentReceiptsPanel.tsx");
check(
  "account command center shows agent receipts",
  dashboard.includes("AgentReceiptsPanel") &&
    receiptsPanel.includes("Agent receipts") &&
    receiptsPanel.includes("What Quorum did"),
  "agentic work must be visible, not hidden in backend tables"
);

const committee = file("convex/committee.ts");
const outreach = file("convex/outreach.ts");
const voice = file("convex/voice.ts");
const rethread = file("convex/rethread.ts");
check(
  "public committee action is access guarded",
  committee.includes("internal.authz.assertAccountAccess"),
  "client-callable account actions need tenant guards"
);
check(
  "public committee action writes agent receipts",
  committee.includes("internal.agentTrace.startRun") &&
    committee.includes("internal.agentTrace.recordStep") &&
    committee.includes("internal.agentTrace.completeRun"),
  "manual committee mapping should be auditable"
);
check(
  "public outreach action is access guarded",
  outreach.includes("internal.authz.assertAccountAccess"),
  "client-callable account actions need tenant guards"
);
check(
  "public outreach action writes agent receipts",
  outreach.includes("internal.agentTrace.startRun") &&
    outreach.includes("internal.agentTrace.recordStep") &&
    outreach.includes("internal.agentTrace.completeRun"),
  "manual draft generation should be auditable"
);
check(
  "voice and rethread agents write receipts",
  voice.includes("internal.agentTrace.startRun") &&
    voice.includes("internal.agentTrace.recordStep") &&
    rethread.includes("internal.agentTrace.startRun") &&
    rethread.includes("internal.agentTrace.recordStep"),
  "voice/rethread memory agents should leave an audit trail"
);

const review = file("src/pages/Review.tsx");
check(
  "review page uses server review queue",
  review.includes("api.queries.listReviewQueue") && !review.includes("useQueries"),
  "review should not fan out account reads from the browser"
);
check(
  "review approvals use guarded mutation",
  review.includes("api.mutations.reviewDraft") && !review.includes("api.mutations.setDraftStatus"),
  "approval should log review events and check account access"
);

const ask = file("src/components/AskQuorum.tsx");
check(
  "Ask Quorum pipeline summary uses real review state",
  !ask.includes('account.status === "needs_review"'),
  "pipeline rows do not use a needs_review status"
);

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  const prefix = item.pass ? "✓" : "✗";
  console.log(`${prefix} ${item.name}${item.pass || !item.detail ? "" : ` — ${item.detail}`}`);
}

if (failed.length) {
  console.error(`\n${failed.length} product smoke check${failed.length === 1 ? "" : "s"} failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} product smoke checks passed.`);
