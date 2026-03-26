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
- app/api/ — six domain API routes (inputs, observations, truths, contrarian-truths, stats, digest)

## Route Map

- `/` → Main dashboard (3-column signal intelligence layout)
- `/api/inputs` → CRUD for signal inputs
- `/api/observations` → CRUD for observations (stores `related_input_ids INT[]` linking back to signal inputs)
- `/api/truths` → CRUD for contrarian truths (thesis, conviction level, status lifecycle, `supporting_observations INT[]`)
- `/api/stats` → Aggregate stats for dashboard header
- `/api/digest` → Weekly digest generation
- `/api/feedback` → Feedback + newsletter signup (boilerplate standard)
- `/api/agent/run` → POST — fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur; filters via Claude (claude-sonnet-4-6); inserts to signal_inputs tagged `agent`

## Current State (as of March 25, 2026)

Insight chain is fully wired: Signal → Observation → Thesis.

- Signal cards have a hover-revealed "→ Observe" button. Opens AddObservationModal pre-filled with the signal title and `related_input_ids`.
- Observation cards have a hover-revealed "→ Add to thesis" button. Opens ObservationTruthPickerModal — a picker of active theses with a "+ Create new thesis" escape hatch at the bottom.
- PATCH `/api/truths` accepts `appendObservationId` — uses `array_append()` to merge without overwriting.
- Truth cards show `supporting_observations.length` as "N obs".

Phase 2 is planned but on hold. Using the system for 3–5 days first to validate the chain produces insight before improving the agent. Tracked in GitHub Issue #2.

Phase 2 will: add a two-step Claude classification chain, include HN comment counts, rewrite the agent prompt for "high pain, low solution density", add a `reason` field per selected signal, and fix the Product Hunt date filter.

## Monetization

email-only — capture newsletter subscribers via the digest. No payment gate at launch.

## Target Subreddits

r/SideProject, r/buildinpublic, r/Entrepreneur

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
