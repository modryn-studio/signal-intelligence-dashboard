# Project Context

## Core Framework

Market: Solo developers and indie builders optimizing for lifestyle and freedom — people who want to observe market signals intelligently before committing to a project.

Reference product (what people pay for): Exploding Topics Pro ($49/mo) — people pay to discover trending topics before they peak. Top complaint: too broad, not actionable for solo builders, no way to capture personal observations alongside the data.

Your angle: Same job (spot emerging opportunities) — but built as a personal intelligence system, not a trend database. Free, self-hosted, focused on a single pipeline: define a market, fill it with signals, observe patterns, form contrarian theses, validate someone pays for it, filter through lifestyle, build.

## Product

A personal daily intelligence system organized around markets. Each market is a separate workspace. You pick a market when you open the app, and every signal, observation, and thesis is scoped to it. New users go through an excavation onboarding to discover which market fits them before they see any data.

Three-column layout per market: signal feed → observations → contrarian truths. Weekly email digest output.

## The 7-Step Pipeline

1. Market you care about — defined on first use via excavation onboarding
2. Build your input system — run the agent, add custom sources, log manually
3. Observe with a question — turn signals into pattern notes
4. Form a contrarian truth — synthesize observations into a bold thesis
5. Validate someone pays for it — proven market research via Claude
6. Filter through Lifestyle/Freedom — 5-filter solo viability assessment
7. Execute — Ready to Build card with handoff to Marc Lou's framework

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
- lib/db.ts — Neon singleton export + `getActiveMarketId()` helper
- lib/types.ts — shared TypeScript types (including Market, MarketSource)
- app/api/ — API routes listed below

## Route Map

- `/` → Market gate — redirects based on market count: 0 → `/onboard`, 1 → `/market/[id]`, 2+ → picker screen. If `skipMarketOnboard` is set in localStorage, shows the unscoped dashboard instead.
- `/onboard` → Excavation onboarding — 4-state flow: welcome → describing (single freeform textarea) → synthesizing (Claude + web_search in progress) → reveal (edit name, description, toggle/add sources, confirm). Confirm creates market in DB, redirects to `/market/[id]?fresh=1`. Has a skip link for existing users.
- `/market/[id]` → Market dashboard — activates the selected market on mount, then renders the full 3-column signal intelligence layout scoped to that market.
- `/api/markets` → CRUD for markets + market_sources. Self-migrates `markets`, `market_sources` tables and `market_id` columns on `signal_inputs`, `observations`, `contrarian_truths` at cold-start. GET returns active market (or `?all=1` for full list with signal counts). PATCH handles name/description edits, `addSource`, `removeSourceId`, and `is_active` toggle.
- `/api/inputs` → CRUD for signal inputs — market-scoped via `getActiveMarketId()`
- `/api/observations` → CRUD for observations — market-scoped; stores `related_input_ids INT[]` linking back to signal inputs
- `/api/truths` → CRUD for contrarian truths — market-scoped; thesis, conviction level, status lifecycle, `supporting_observations INT[]`, `proven_market TEXT`, `lifestyle_pass BOOLEAN`, `lifestyle_results JSONB`
- `/api/stats` → Aggregate stats for dashboard header
- `/api/digest` → Weekly digest generation
- `/api/feedback` → Feedback + newsletter signup
- `/api/agent/run` → POST — market-aware: injects market name + description into Claude prompt as a focus filter; fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur plus any custom subreddits from `market_sources`; stamps `market_id` on every insert; custom-source items tagged `['agent', 'custom-source']`
- `/api/agent/evaluate` → POST — fetches actual source content (Reddit JSON, HN Algolia, article HTML), calls Claude with web search, returns `EvaluationResult[]` + `Synthesis`
- `/api/agent/propose` → POST — reads last 30 observations, calls Claude once, returns `{ thesis, supporting_observations, conviction_level, reasoning }` — powers the Synthesize button in Section 2
- `/api/agent/excavate` → POST `{ description: string }` — single freeform description → Claude (with web_search) synthesizes `{ market_name, description, reasoning, recommended_sources[] }`. Uses web_search to verify subreddits. Powers onboarding.
- `/api/agent/validate` → POST — reads a thesis string, calls Claude (no web search, fast), returns `{ proposed_proven_market }` — powers competitor research in ValidateThesisModal; results cached in localStorage by thesis ID + date
- `/api/agent/lifestyle` → POST — reads `{ thesis, proven_market }`, calls Claude, returns `{ questions: [{ label, pass, reasoning }], overall_pass }` — 5-filter solo lifestyle assessment; Q2 (recurring revenue) is a knockout filter

## Current State (as of March 31, 2026)

Full pipeline is wired: Market → Signal → Observation → Thesis → Validate → Lifestyle → Ready to Build.

**Onboarding / Market gate**

- First-time user lands at `/` → redirected to `/onboard`.
- Onboarding: single freeform textarea → Claude (with web_search) synthesizes a market workspace name, description, reasoning, and verified custom sources. User reviews/edits, then confirms. Market is created in DB and user lands at `/market/[id]?fresh=1`, which auto-opens AgentRunModal to fire the first signal run.
- Multi-market users see a picker at `/`. Each market is a separate routed workspace.
- Skip link available on onboarding for existing users who want the unscoped dashboard (`skipMarketOnboard` localStorage flag).
- Market name appears in the dashboard header as a small orange mono badge (clickable → MarketConfigModal to edit name/description, manage custom subreddits, navigate to All markets or + New market).

**Section 1 — Signal Feed**

- Signal cards have a hover-revealed "→ Observe" button. Opens AddObservationModal pre-filled with the signal title and `related_input_ids`.
- Agent dropdown ("Agent ▾") — two actions: Run Agent, Deep Evaluate.
- **Run Agent** — fetches HN, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur, plus any custom subreddits added to the active market. Injects market context into Claude's prompt as a focus filter. Stamps `market_id` on every signal.
- **Deep Evaluate** — opens EvaluateSignalsModal. Fetches real source content per signal, calls Claude (claude-sonnet-4-6) with `web_search_20260209` tool (max 3 uses). Returns verdicts (observe/skip/delete) + Synthesis block (priority signals, pattern, thesis candidate). Results cached in localStorage by date.
- EvaluateSignalsModal "✓ Accept top signals + form thesis" button: saves priority signals as observations → POSTs thesis to `/api/truths` with linked obs IDs.

**Section 2 — Observations**

- Observation cards have a hover-revealed "→ Add to thesis" button → ObservationTruthPickerModal.
- PATCH `/api/truths` accepts `appendObservationId` — uses `array_append()` to merge without overwriting.
- **Synthesize button** appears when `observations.length >= 3`. Opens SynthesizeObservationsModal — calls `/api/agent/propose`, reads last 30 obs across all dates, returns thesis proposal + supporting obs + conviction level. Day-scoped localStorage cache; Re-run ↺ in footer; AbortController on close.

**Section 3 — Contrarian Theses**

- Truth cards show `supporting_observations.length` as "N obs".
- Truth cards show `proven_market` (truncated to 80 chars with inline `· · · view →` expand toggle) below the thesis text when set.
- Status lifecycle: `forming → validated → (lifestyle pass) → Ready to Build`. No `confident` status.
- **Tab-aware header buttons**: Active tab shows "Validate →" when forming theses exist; Validated tab shows "Lifestyle →" when unassessed validated theses exist.
- **ValidateThesisModal** — ←/→ navigation across all forming theses, agent auto-researches competitors (`/api/agent/validate`), editable `proven_market` textarea, "Validate →" button saves `{ status: 'validated', proven_market }`. Results cached in localStorage by thesis ID + date.
- **Lifestyle filter — two paths**:
  - Card hover button "Lifestyle →" (manual): inline Dialog with 5 checkboxes, Q2 labelled "required", pass counter.
  - Header button "Lifestyle →" (agentic): LifestyleFilterModal — ←/→ navigation, 3-step progress animation, calls `/api/agent/lifestyle`, shows 5 ✓/✗ results + reasoning. Cache per thesis + date.
- **Q2 knockout**: "Recurring revenue day one" — fail this = `overall_pass: false` regardless of other scores. Pass threshold: 4 of 5.
- **ReadyCard**: Shown for `validated && lifestyle_pass === true`. Displays thesis (italic), proven_market snippet (expandable), lifestyle filter labels (✓/✗), handoff line.
- **DB columns** (all self-migrated at cold-start):
  - `proven_market TEXT`
  - `lifestyle_pass BOOLEAN`
  - `lifestyle_results JSONB`
  - `market_id INT REFERENCES markets(id)` (on signal_inputs, observations, contrarian_truths)

## Monetization

email-only — capture newsletter subscribers via the digest. No payment gate at launch.

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
