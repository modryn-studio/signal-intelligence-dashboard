# Project Context

## Core Framework

Market: Solo developers and indie builders optimizing for lifestyle and freedom — people who want to observe market signals intelligently before committing to a project.

Reference product (what people pay for): Exploding Topics Pro ($49/mo) — people pay to discover trending topics before they peak. Top complaint: too broad, not actionable for solo builders, no way to capture personal observations alongside the data.

Your angle: Same job (spot emerging opportunities) — but built as a personal intelligence system, not a trend database. Free, self-hosted, focused on one question: "Where is something growing fast but being served poorly?" No noise. No subscription. Yours.

## Product

A personal daily dashboard that aggregates market signal sources, prompts you with a single focusing question each day, and lets you capture and track observations over time — so patterns surface and contrarian insights emerge. Three-column layout: signal feed → observations → truths. Weekly email digest output.

## Target User

A solo developer who wants to build a lifestyle business but doesn't know where to start. They're not looking for a trend report — they're trying to train themselves to see what others miss. They already know how to build. They don't yet know what to build.

## Deployment

mode: standalone-domain
url: https://www.modrynstudio.com/tools/signal-intelligence
basePath: (empty — standalone deployment)

modrynstudio.com has a verified Domain property in Google Search Console.

## Minimum Money Loop

Email digest → observation loop → (future) paid briefing product
Current: email-only — no payment gate.

## Stack Additions

- @neondatabase/serverless — Neon Postgres via tagged SQL template literals
- swr — client-side data fetching for dashboard panels
- recharts — charts for stats panel
- @vercel/analytics — pageview tracking (already in layout)
- @anthropic-ai/sdk — Anthropic Claude (claude-sonnet-4-6) for agent-based signal gathering

## Project Structure Additions

- schema.sql — one-time DB bootstrap (already run in Neon)
- lib/db.ts — Neon singleton export
- lib/types.ts — shared TypeScript types
- app/api/ — seven domain API routes (inputs, observations, truths, stats, digest, agent/run, agent/evaluate)

## Route Map

- `/` → Main dashboard (3-column signal intelligence layout)
- `/api/inputs` → CRUD for signal inputs
- `/api/observations` → CRUD for observations (stores `related_input_ids INT[]` linking back to signal inputs)
- `/api/truths` → CRUD for contrarian truths (thesis, conviction level, status lifecycle, `supporting_observations INT[]`)
- `/api/stats` → Aggregate stats for dashboard header
- `/api/digest` → Weekly digest generation
- `/api/feedback` → Feedback + newsletter signup (boilerplate standard)
- `/api/agent/run` → POST — fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur; filters via Claude; inserts to signal_inputs tagged `agent`
- `/api/agent/evaluate` → POST — fetches actual source content (Reddit JSON, HN Algolia, article HTML), calls Claude with web search, returns `EvaluationResult[]` + `Synthesis`

## Current State (as of March 26, 2026)

Insight chain is fully wired: Signal → Observation → Thesis.

- Signal cards have a hover-revealed "→ Observe" button. Opens AddObservationModal pre-filled with the signal title and `related_input_ids`.
- Observation cards have a hover-revealed "→ Add to thesis" button. Opens ObservationTruthPickerModal — a picker of active theses with a "+ Create new thesis" escape hatch at the bottom.
- PATCH `/api/truths` accepts `appendObservationId` — uses `array_append()` to merge without overwriting.
- Truth cards show `supporting_observations.length` as "N obs".

Agent dropdown ("Agent ▾") in signal feed header — two actions:

- **Run Agent** — fetches and filters signals via Claude, shows step-progress modal, offers "→ Deep evaluate" shortcut on completion.
- **Deep Evaluate** — opens EvaluateSignalsModal. Fetches real source content per signal, calls Claude (claude-sonnet-4-6) with `web_search_20260209` tool (max 3 uses per run). Returns per-card verdicts (observe/skip/delete) + a Synthesis block (priority signals, pattern, thesis candidate). Results cached in localStorage by date; Re-run button force-refreshes.

EvaluateSignalsModal one-click loop:

- Collapsible Analysis panel shows synthesis (priority, pattern, thesis candidate).
- "✓ Accept top signals + form thesis" button: saves priority signal(s) as observations → POSTs to `/api/truths` with linked observation IDs. One click closes the signal → observation → thesis chain.
- Individual cards: Accept (saves observation) or Delete.
- Filter tabs: observe / skip / delete / all.

Evaluate prompt lens: "Where is something growing fast but being served poorly?" OBSERVE requires evidence of BOTH growth (adoption, scale, engagement numbers) AND poor service (no dominant solution, DIY workarounds, people still stuck). proposed_body is two grounded sentences — growth evidence, then service failure — no assertions beyond what source content confirms. thesis_candidate is a contrarian belief about market misconfiguration, not a product pitch.

Phase 2 is planned but on hold. Using the system for 3–5 days to validate the chain produces insight before improving the agent. Tracked in GitHub Issue #2.

Phase 2 will: add a two-step Claude classification chain, include HN comment counts, add a `reason` field per selected signal (pre-fills observation body), and fix the Product Hunt date filter.

## Monetization

email-only — capture newsletter subscribers via the digest. No payment gate at launch.

## Target Subreddits

r/SideProject, r/buildinpublic, r/Entrepreneur

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
