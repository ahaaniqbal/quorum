# Quorum

**The autonomous AI account executive that works the entire buying committee, remembers every conversation, and acts across your stack.**

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

- **Convex** — backend, database, realtime reactive queries, scheduler, hosting
- **React + Vite + TypeScript + Tailwind + Framer Motion** — frontend (Linear-dark aesthetic)
- **OpenAI** — qualification, persona outreach (key-optional)
- **getleads / Fiber** — company + decision-maker enrichment (committee uses real, verified people)
- **Vapi + Deepgram** — live in-browser voice rep (key-optional; server-streamed simulation as fallback)
- **Composio** — real Slack / HubSpot / Calendar actions (key-optional)

Every integration is **key-optional**: a real path when the env key is present, and a high-fidelity simulated fallback otherwise — so the demo runs end-to-end with zero keys and lights up further as keys are added.

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
