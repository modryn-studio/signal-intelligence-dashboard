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
- `/api/truths` → CRUD for contrarian truths (thesis, conviction level, status lifecycle, `supporting_observations INT[]`, `proven_market TEXT`)
- `/api/stats` → Aggregate stats for dashboard header
- `/api/digest` → Weekly digest generation
- `/api/feedback` → Feedback + newsletter signup (boilerplate standard)
- `/api/agent/run` → POST — fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur; filters via Claude; inserts to signal_inputs tagged `agent`
- `/api/agent/evaluate` → POST — fetches actual source content (Reddit JSON, HN Algolia, article HTML), calls Claude with web search, returns `EvaluationResult[]` + `Synthesis`
- `/api/agent/propose` → POST — reads last 30 observations (all dates), calls Claude once, returns `{ thesis, supporting_observations, conviction_level, reasoning }` — powers the Synthesize button in Section 2

## Current State (as of March 30, 2026)

Full insight chain is wired: Signal → Observation → Thesis → Validate.

**Section 1 — Signal Feed**

- Signal cards have a hover-revealed "→ Observe" button. Opens AddObservationModal pre-filled with the signal title and `related_input_ids`.
- Agent dropdown ("Agent ▾") — two actions: Run Agent, Deep Evaluate.
- **Run Agent** — fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur; filters via Claude; inserts to signal_inputs tagged `agent`.
- **Deep Evaluate** — opens EvaluateSignalsModal. Fetches real source content per signal, calls Claude (claude-sonnet-4-6) with `web_search_20260209` tool (max 3 uses). Returns verdicts (observe/skip/delete) + Synthesis block (priority signals, pattern, thesis candidate). Results cached in localStorage by date.
- EvaluateSignalsModal "✓ Accept top signals + form thesis" button: saves priority signals as observations → POSTs thesis to `/api/truths` with linked obs IDs.

**Section 2 — Observations**

- Observation cards have a hover-revealed "→ Add to thesis" button → ObservationTruthPickerModal.
- PATCH `/api/truths` accepts `appendObservationId` — uses `array_append()` to merge without overwriting.
- **Synthesize button** appears in the Section 2 header when `observations.length >= 3`. Opens SynthesizeObservationsModal — calls `/api/agent/propose`, reads last 30 obs across all dates, returns thesis proposal + supporting obs + conviction level. Day-scoped localStorage cache; Re-run ↺ in footer; AbortController on close. After thesis created, cache clears.

**Section 3 — Contrarian Theses**

- Truth cards show `supporting_observations.length` as "N obs".
- Truth cards show `proven_market` (truncated to 80 chars) below the thesis text when set.
- **Validate → button** appears in the Section 3 header when any `forming` or `confident` thesis exists. Opens ValidateThesisModal.
- **ValidateThesisModal** — thesis picker (auto-selects if only one), editable `proven_market` text field, lifestyle filter (3 yes/no: adds freedom / can build alone / plays to skills), Marc Lou path (shown only when all 3 pass). Footer: "Save & Advance" (advances status when lifestyle passes) / "Save" (saves proven_market only).
- **Advance → gating**: on `confident` theses, Advance → is disabled if `proven_market` is blank. Must validate before calling it Validated.
- `proven_market TEXT` column added to `contrarian_truths` — migrated automatically at cold-start via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Old Socratic "Form thesis" inline dialog removed. Section 2's Synthesize button is the easy path to thesis creation; "+ Form Thesis" in Section 3 header is the manual path.

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
