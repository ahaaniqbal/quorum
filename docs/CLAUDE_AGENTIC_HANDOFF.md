# Claude Handoff: Quorum 10/10 Agentic Direction

## Product Thesis
Quorum should demo as an autonomous account-execution system, not a CRM, dashboard, or chatbot. The core product promise is:

1. Ingest a lead or account signal.
2. Enrich the company and build account memory.
3. Map the buying committee with verified people only.
4. Draft customer-facing work behind a human review gate.
5. Close the loop into customer systems with auditable tool receipts.
6. Let Ask Quorum explain what changed, what agents did, what is blocked, and what the human should do next.

The moat story is governed autonomy: agents do end-to-end GTM work, but every risky or customer-facing action has evidence, confidence, review gates, and receipts.

## Current Agentic Spine
The app now has durable agent run receipts in Convex:

- `convex/schema.ts`: `agentRuns` and `agentSteps` tables.
- `convex/agentTrace.ts`: internal helpers and account-scoped query.
- `convex/queries.ts`: `getAccountFull` returns `agentRuns` with ordered `steps`.

These paths now write receipts:

- `convex/inbound.ts`: autonomous inbound enrichment → committee → outreach scheduling.
- `convex/committee.ts`: manual/public committee mapping.
- `convex/outreach.ts`: manual/public draft generation.
- `convex/voice.ts`: AI qualification call opening and call analysis.
- `convex/rethread.ts`: rethreading known committee members with prior account memory.
- `convex/closeLoop.ts`: review-approved Slack/CRM/calendar/email action jobs.

## Visible Product Surfaces
The agentic proof is visible, not hidden:

- `src/components/AgentReceiptsPanel.tsx` renders the latest run, steps, tools, status, gates, and timestamps.
- `src/pages/Dashboard.tsx` places `AgentReceiptsPanel` right after the account masthead and decision hero.
- `src/components/AskQuorum.tsx` has starter text `What did the agents do?` and answers from `deal.agentRuns`.
- `convex/seedDemo.ts` seeds demo agent receipts so judges see proof immediately.

## Demo Story To Preserve
The judge-facing demo should feel like this:

1. Open Home: understand the operating loop and what needs attention.
2. Open a sample account: see state, decision, and `Agent receipts` immediately.
3. Ask Quorum: “What did the agents do?” and get a grounded tool/step answer.
4. Review drafts/actions: human gate remains explicit.
5. Close loop: receipts show real or blocked destination actions.
6. Integrations page explains that Slack/CRM/email/calendar are customer-connected systems, not build-time tools.

## Design Constraints
Follow `AGENTS.md` first. Key reminders:

- Dark sharp operator UI, square edges.
- Orange accent only; avoid blue/purple tints.
- No em dashes in product copy.
- Dot/grid pattern in content, not top bars.
- Keep hierarchy clear: what happened, what needs attention, what next.
- Do not make Ask Quorum the whole product. It is a copilot surface over autonomous execution.

## What Still Makes It More Agentic
If you continue from here, prioritize these in order:

1. Live integration proof: once Composio and AgentMail keys/accounts exist, make Slack/HubSpot/Calendar/email actions complete for real and expose returned IDs/URLs in receipts.
2. Vapi live-call polish: make the voice path obviously real in the UI, with call status and transcript feeding account memory.
3. Receipt detail UX: let users expand a receipt step to see `input`, `output`, `externalId`, and `error` without overwhelming the main page.
4. Evaluation mode: add a single judge-safe “Run agent demo” path that creates a fresh lead and shows receipts streaming in.
5. Source evidence: connect enrichment/committee claims back to sources where available.

## Validation Commands
Run these before pushing:

```bash
npx convex codegen
npm run smoke
npm run build
```

Current smoke expectations include:

- Inbound uses autonomous committee/outreach engines.
- Autonomous work writes run receipts.
- Close-loop actions write receipts.
- Account command center shows agent receipts.
- Review and public action paths remain access guarded.

## Caution
This branch contains both Claude UI refinements and Codex backend/product-agentic work. Before large visual changes, inspect current `git status` and avoid reverting:

- `src/main.tsx` unauthenticated route setup.
- `src/pages/SignIn.tsx` standalone auth card.
- `src/components/ReactiveGrid.tsx` background grid.
- `src/pages/Landing.tsx` CTA links to `/signin` and `/login`.
- `src/components/AgentReceiptsPanel.tsx` and Convex trace tables.
