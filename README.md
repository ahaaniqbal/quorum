# Quorum

**Every other AI sales tool talks to one lead and forgets the conversation by morning. Quorum works the entire buying committee, remembers every conversation, and takes real action across your stack — autonomously.**

🔗 **Live (one click, no signup):** https://quorum-runaegis-projects.vercel.app · **Repo:** https://github.com/ahaaniqbal/quorum

> Open it and hit **"Try a sample company"** — Quorum enriches the account, shows the qualifying call, maps the full buying committee, drafts persona-tuned outreach to each member, and fires the cross-tool actions, end to end, with zero setup.

Built for the AI Growth Hackathon (by Orange Slice). Sponsors used: **Convex** (backend, realtime, host), **Fiber AI** (enrichment + people search), **Orange Slice** (LinkedIn enrichment), **OpenAI** (qualification + outreach).

### What makes it different
- **Multi-threads the committee automatically** — the thing reps can't hold in their head.
- **One compounding account brain** — it never forgets; a second contact from the same company threads into the same deal with full prior context.
- **Acts** — real Slack / CRM / calendar actions, not just another inbox.

### For reviewers
- **No signup** — you land in a populated pipeline as a guest. Three example accounts are pre-loaded; the hero (Ramp) is fully worked so you can see the whole story immediately.
- **The autopilot drives itself** — drop any work email and it runs enrich → committee → outreach → actions on its own. The live voice/chat call is an optional "Talk to the AI rep" action, not a gate.
- **Robust by design** — personal emails, unknown companies, and malformed input all produce a clean result; every external call has an 8s timeout with graceful fallback.

Every GTM tool today talks to one lead and forgets the conversation by morning. Quorum talks to the whole room and never forgets.

## The flow

1. A prospect drops a work email on a clean landing page.
2. Quorum **enriches them live** — company, role, funding signals — and spins up a persistent **account brain**.
3. An **AI voice rep** qualifies them on a live call, handles an objection, and books a meeting. The transcript streams to a realtime dashboard and a BANT qualification score fills in as the call progresses.
4. Quorum **maps the rest of the buying committee** (economic buyer, technical, end user) and renders a live deal map of real decision-makers.
5. It **closes the loop** with real cross-tool actions (Slack alert, CRM record, calendar invite) and drafts **persona-tuned outreach** to every committee member.
6. The kicker: a **second person from the same company** arrives, and Quorum already knows the account — it threads them into the same brain and *advances* the deal instead of starting cold.

## Why it wins

- **Multi-threads the committee automatically** — the thing reps can't hold in their head.
- **One compounding account brain** across people and touches — never forgets.
- **Closes into real cross-tool action** — not just another inbox.

## Built on Convex

The entire dashboard is **reactive Convex state with no polling**. Every external integration runs in a Convex function that writes events/records back to the DB, and the UI updates on its own. Transcript streaming, the qualification scorecard, the committee map, the action rail, and the re-thread beat are all driven by reactive queries over the Convex DB. Uses the Convex scheduler to stream the live call and stagger committee/action animations.

## Stack

- **Convex** — backend, database, realtime reactive queries, scheduler. The entire dashboard is reactive Convex state with no polling; the live call, committee map, and action loop are streamed via the Convex scheduler.
- **Fiber AI** — real enrichment: `email-to-person` reverse lookup for the primary contact, `kitchen-sink/company` for firmographics (funding, headcount, revenue, tech, logo), and `people-search` for the buying committee.
- **Orange Slice** — LinkedIn enrichment via its HTTP-MCP (followers, founded year, HQ), folded into the account brain alongside Fiber.
- **OpenAI** — persona-tuned committee outreach and call qualification.
- **React + Vite + TypeScript + Tailwind + Framer Motion** — frontend (Linear-dark aesthetic), hosted on Vercel.
- Optional: Composio (real Slack), Firecrawl (brand theming), HydraDB (account-brain graph) — wired and key-gated.

Every external integration is **best-effort with a high-fidelity fallback**: a real path when the env key is present, and a curated/simulated path otherwise — so the demo always runs end-to-end and never breaks live. The voice rep is a server-streamed simulated call (reliable on stage); a real Vapi web-call path is wired for when a key is added.

## Run it

```bash
npm install

# Convex (anonymous local deployment — no account needed)
CONVEX_AGENT_MODE=anonymous npx convex dev

# In another terminal
npm run dev          # http://localhost:5173
```

### Enable real integrations (optional)

Frontend keys in `.env.local`:

```
VITE_VAPI_PUBLIC_KEY=...     # real in-browser voice call
VITE_VAPI_ASSISTANT_ID=...   # optional prebuilt assistant
```

Server keys (read by Convex functions):

```bash
npx convex env set OPENAI_API_KEY ...     # real qualification + outreach
npx convex env set COMPOSIO_API_KEY ...   # real Slack action
```

## Demo inputs

Use a known company for the richest enrichment + real committee: `alex@ramp.com`, `alex@linear.app`, `alex@vercel.com`, `alex@notion.so`. Any other domain falls back to a derived profile + synthesized committee.
