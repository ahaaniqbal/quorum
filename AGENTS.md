# Quorum Agent Context

## Product North Star
- Quorum is an AI-first account executive / account brain for early GTM teams.
- The product should feel like a serious operator-grade system: powerful, technically hard, but simple to understand at every step.
- The core loop is: ingest leads → build account brain → hold risky/customer-facing work for review → close the loop into customer systems.
- Do not let the product drift into “generic CRM dashboard” or “just a chatbot.” Ask Quorum is a copilot layer, but the moat is autonomous account execution plus review-gated trust.

## Current Product Shape
- `src/App.tsx` owns routing and top-level state.
- Key routes:
  - `/` is the Home command center.
  - `/pipeline` is the account pipeline and lead intake.
  - `/setup` is onboarding/setup for sources and operating policy.
  - `/review` is the human review gate for drafts/actions.
  - `/integrations` is customer-facing integrations only.
  - `/onboarding` is first-run product onboarding.
  - `/deal/:accountId` is the account command center.
- Convex powers data/actions under `convex/`; generated types live in `convex/_generated`.

## Design System Rules
- Keep the dark, sharp, grid-based operator UI. Use square edges; avoid rounded cards except where already deeply baked in.
- Orange is the brand/action accent. Avoid blue and purple tints unless explicitly requested.
- The dot/grid pattern belongs in content surfaces, not in top bars.
- Prioritize hierarchy over density: every screen should answer “what happened, what needs my attention, and what should I do next?”
- Icons should be relevant Lucide icons or real brand/company logos. Avoid generic decorative marks.
- CTAs should be consistent in height and visual weight.
- Keep copy direct and explanatory. Avoid em dashes in product copy.

## Recent Work In This Branch
- Added official Quorum logo, favicon, and loader assets in `public/`.
- Updated navbar, splash, landing, sign-in, and onboarding surfaces to use the new Quorum branding.
- Reworked `/deal/:accountId` from a dense cockpit into a clearer account command center:
  - Account status and trust signals appear first.
  - “Next human decision” is explicit.
  - Recommended move is the primary instruction.
  - Account brain, committee map, activity, call, and actions are supporting evidence below/alongside.
- The redesign was checked at desktop and mobile widths for overflow.

## Validation Commands
- Install dependencies with `npm install` if needed.
- Run the app with `npm run dev`.
- Run Convex + web together with `npm run dev:all`.
- Validate production build with `npm run build`.

## Collaboration Notes
- Keep changes focused and surgical unless the user asks for a broader product push.
- Never commit secrets. `.env.local`, `secrets.env`, `.vercel`, `dist`, and build info are ignored.
- If deploying, use the existing Vercel project config in `.vercel/` locally; do not commit `.vercel`.
- If adding context for Claude Code, keep `CLAUDE.md` aligned with this file.

## Near-Term Priorities
- Make onboarding truly first-run/customer-ready: guide users from source connection to first reviewed account.
- Turn Ask Quorum into a useful account copilot with grounded answers from account state, not generic chat.
- Deepen trust: evidence, confidence, gaps, and review gates must be legible and actionable.
- Improve real integrations: CRM, email, calendar, Slack, webhook/inbound source.
- Continue responsive QA across desktop, laptop, tablet, and mobile.
