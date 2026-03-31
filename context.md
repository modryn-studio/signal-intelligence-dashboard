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
- lib/agent-guard.ts — shared safety guards: `AGENT_TIMEOUT_MS` (60s), `WEB_SEARCH_TIMEOUT_MS` (45s), `withTimeout()` helper. All `client.messages.create()` calls wrapped.
- lib/types.ts — shared TypeScript types (including Market, MarketSource, ContrarianTruth, etc.)
- app/api/ — API routes listed below

## Route Map

- `/` → Market gate — fetches `/api/markets?all=1`; redirects: 0 markets → `/onboard`, 1 market → `/market/[id]`, 2+ → inline `<MarketPicker>` sorted by signal count descending with "+ New market" button.
- `/onboard` → Excavation onboarding — 2-screen flow:
  - **Screen 1 (Interests)**: Grid of 12 interest tags (max 3 selectable) + freetext input. "Find my markets →" calls `/api/agent/excavate`. "Already have a market? Skip →" navigates to `/` (no localStorage flag — MarketGate handles all routing).
  - **Screen 2 (Picking)**: Shows 4 market cards — each represents a market segment (people + problem + existing spend), not a product idea. Card headline is the person/group (e.g. "Independent Restaurant Owners"), body describes their world (what they pay for, what frustrates them). Demand badge (proven/growing/crowded). Price range reflects what the market already pays. Inline "None of these feel right" refinement with 7 steer tags + "Regenerate →". Selecting a card POSTs to `/api/markets` (name = niche, description = market description), fires `/api/agent/run` silently, navigates to `/market/[id]`.
  - Loading state: Full-screen `ExcavateLoading` component with 30s ease-out CSS progress bar during the ~15s stub phase (bar reaches ~70% when cards arrive, stays there while enrich finishes in background).
- `/market/[id]` → Market dashboard — on mount PATCHes `/api/markets` to activate the market (single atomic SQL: `is_active = (id = $id)`), shows spinner while PATCH in flight, then renders full dashboard with `<DashboardHeader marketId={id}>` + `<DashboardLayout>`.

## API Routes

- `/api/markets` → CRUD for markets + market_sources. Self-migrates `markets`, `market_sources` tables and `market_id` columns on `signal_inputs`, `observations`, `contrarian_truths` at cold-start.
  - `GET` (no params): returns `{ market, sources }` for active market
  - `GET ?all=1`: returns `Market[]` with `signal_count` each
  - `POST { name, description, sources[] }`: deactivates all, creates new active market, inserts sources
  - `PATCH { id, is_active: true }`: atomic single-statement activation (`UPDATE ... SET is_active = (id = $id) WHERE id = $id OR is_active = true`)
  - `PATCH { id, name?, description? }`: update market name/description
  - `PATCH { id, addSource }` / `PATCH { id, removeSourceId }`: manage market_sources
  - `DELETE ?id=N`: CASCADE deletes market_sources via FK
- `/api/inputs` → CRUD for signal inputs — market-scoped via `getActiveMarketId()`
  - `GET ?date&category&limit=50`: returns `SignalInput[]`
  - `POST { source, source_category, title, url?, notes?, tags, date }`: insert
  - `DELETE ?id=N`
- `/api/observations` → CRUD for observations — market-scoped
  - `GET ?limit=30&date?&tag?`: returns `Observation[]` with related inputs joined
  - `POST { title, body, related_input_ids, tags, date }`: insert
  - `DELETE ?id=N`
- `/api/truths` → CRUD for contrarian truths — market-scoped
  - `GET`: returns `ContrarianTruth[]` ordered by `updated_at DESC`
  - `POST { thesis, conviction_level, status, supporting_observations?, date }`: insert
  - `PATCH { id, ...fields }`: update — fields: `conviction_level`, `status`, `thesis`, `proven_market`, `lifestyle_pass`, `lifestyle_results`, OR `appendObservationId` (array_append to supporting_observations)
  - `DELETE ?id=N`
- `/api/stats?today={YYYY-MM-DD}&marketId={id}` → Aggregate stats scoped to market (prefers `marketId` param over `is_active` lookup to avoid race on navigation)
  - Returns: `{ today_inputs, total_inputs, total_observations, total_truths, category_breakdown, recent_streak }`
  - `category_breakdown`: `[{ source_category, count }]` last 7 days
  - `recent_streak`: `[{ date, count }]` last 14 days
- `/api/digest` → POST `{ email }` — generates HTML email (inputs by category, observations, active truths filtered by `status != 'invalidated'`; all market-scoped via `getActiveMarketId()`); inserts to `email_digests` table; returns `{ success, preview: htmlString, stats }`. Delivery requires Resend/SMTP config.
- `/api/feedback` → POST `{ type: 'newsletter'|'feedback'|'bug', email?, message?, page? }` — logs to console; optional Resend/SMTP delivery
- `/api/agent/run` → POST `{ today: YYYY-MM-DD }` — market-aware: injects active market name + description into Claude prompt as focus filter; fetches HN (Algolia), Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur + custom subreddits from `market_sources`; Claude (claude-sonnet-4-6, no tools, 60s timeout, req.signal threaded) selects ~10 most relevant, assigns `source_category`; deduplicates by URL+title for today; stamps `market_id`; custom-source items tagged `['agent', 'custom-source']`; returns `{ logged, fetched, question }`
- `/api/agent/evaluate` → POST `{ date? }` — streaming NDJSON; fetches signal_inputs for date; evaluates in batches of 5 (concurrency cap); for each: fetches real source content first (Reddit JSON API, HN Algolia, article HTML); Claude (claude-sonnet-4-6, req.signal threaded) returns `observe|skip|delete` + proposed observation title+body; **web_search is conditional** — skipped when content was fetched (60s timeout), used as fallback (max 1 use, 45s timeout) only when content fetch returns empty; streams each result as a JSON line; final chunk is synthesis (priority IDs, priority statement, patterns, thesis candidate) — synthesis always has web_search available (max 1 use, 45s timeout, req.signal threaded)
- `/api/agent/propose` → POST (no body) — reads last 30 observations (all dates); Claude (no tools, 60s timeout, req.signal threaded) finds structural pattern → proposes one thesis; returns `{ thesis, conviction_level, supporting_observations: [{id, title}], reasoning }`; client caches in localStorage by date under `propose-cache`
- `/api/agent/validate` → POST `{ thesis }` — Claude (no tools, 60s timeout, req.signal threaded) lists 2–3 real products serving this thesis; returns `{ proposed_proven_market }`; client caches in localStorage by thesis ID + date under `validate-cache`
- `/api/agent/lifestyle` → POST `{ thesis, proven_market }` — Claude (no tools, 60s timeout, req.signal threaded) assesses 5 filters (solo maintainable, recurring revenue day one, VC-ignored TAM, reachable first 20, boring enough for 5 years); Q2 (recurring revenue) is a knockout filter; returns `{ questions: [{label, pass, reasoning}], overall_pass }`; client caches in localStorage by thesis ID + date under `lifestyle-cache`
- `/api/agent/excavate` → POST `{ tags: string[], description?: string, steer?: string[] }` — Streaming NDJSON. Two-phase:
  - **Stub phase**: Claude (claude-sonnet-4-6, no tools) generates 4 market segments as people-first cards. Each card names the person (market_name = group, e.g. "Independent Restaurant Owners"), their world (description = what they pay for, what frustrates them), demand level, and price range. Explicitly bans product names or tool ideas — the micro niche emerges from the signal feed, not from onboarding. Streamed as `{type:'market', data: MarketOption}` chunks.
  - **Enrich phase**: 4 parallel Claude calls with `web_search_20260209` (max 1 use each, 2048 max_tokens, 45s timeout, in-flight dedup, req.signal threaded — aborts on client disconnect). Verifies pricing, finds subreddits, names specific competing products. Streamed as `{type:'update', data}` chunks.
  - Steer path: cheap re-generation with modifiers, no web search.
  - Each MarketOption: `{ overall_market, niche, micro_niche, market_name, price_range, demand: 'proven'|'growing'|'crowded', description, reasoning, recommended_sources: [{source_type, value}] }`
- `/api/agent/discover-sources` → POST `{ market_name, micro_niche, description?, existing_subreddits? }` — Streaming NDJSON; Claude with `web_search_20260209` (3–5 uses depending on whether subreddits already known from enrich, 45s timeout, req.signal threaded); in-flight dedup per market_name (Set); finds subreddits + G2/Capterra product pages; streams as `{type:'source', data: DiscoveredSource}` chunks.

## Current State (as of March 31, 2026)

Full pipeline is wired: Market → Signal → Observation → Thesis → Validate → Lifestyle → Ready to Build.

### Onboarding / Market Gate

- `/` fetches market list: 0 → `/onboard`, 1 → `/market/[id]`, 2+ → `MarketPicker` inline. No localStorage flags — routing is purely based on market count.
- `MarketPicker` at `/`: markets sorted by `signal_count DESC`, each card shows name + description + signal count. "+ New market" button navigates to `/onboard`.
- Onboarding is 2-screen: interest tags/freetext → market card selection. Cards show market segments (person + problem + existing spend), not product ideas. `ExcavateLoading` full-screen component shows during the ~15s stub phase (30s ease-out CSS progress bar — bar reaches ~70% when cards arrive). Steer refinement inline on screen 2.
- **Cost safety on onboarding**: `OnboardContent` aborts in-flight requests on unmount (component cleanup `useEffect`). `doExcavate` re-entry guard: bails if already loading. Enrich calls thread `reqSignal` from HTTP request — client disconnect cancels all 4 parallel web_search calls immediately.
- Skip → navigates to `/` directly (MarketGate handles routing based on market count; if 0 markets, redirects back to `/onboard`).
- Market activated via single atomic SQL PATCH on `/market/[id]` mount — no two-statement race condition.
- `DashboardHeader` renders immediately on market page mount (outside the PATCH spinner); only `DashboardLayout` is gated. Stats URL includes `marketId` param to avoid stale SWR cache across markets.

### Header

- `<DashboardHeader marketId={id}>` — sticky, renders above PATCH spinner.
- Market name inline with date: `— Tuesday, March 31, 2026 · AI DEV TOOLS ⌄`
- Dropdown: other markets → navigate, "Edit sources & name" → MarketConfigModal, separator, "All markets" → `/`, "+ New market" → `/onboard`.
- Active market derived from `allMarkets.find(m => m.id === marketId)` (not `is_active` flag) to avoid lag.
- Stats SWR key includes `marketId` — per-market cache, no cross-market bleed on navigation.

### Section 1 — Signal Feed

- Filter tabs: All | trends | complaints | indie | data. "All" groups by category with inline "+ add" buttons per group.
- Input cards show: category dot, title (linkable), source badge, tags, time. Notes shown as italic left-border block (toggle). Hover/touch: "→ Observe" button (opens AddObservationModal prefilled), delete (confirm AlertDialog).
- **Run Agent** — opens `AgentRunModal` (3-step progress: Fetching → Filtering → Logging). After completion: "X signals logged" + "→ Deep evaluate" + "View signals".
- **Deep Evaluate** — opens `EvaluateSignalsModal` (streaming NDJSON, progressive card rendering). Cards show observe/skip/delete verdict + reasoning. "Accept" saves observation. "Delete card" removes signal. Bulk actions: "✓ Accept top signals (N)" + "Delete noise (N)". Filter tabs post-stream. Synthesis block at bottom. LocalStorage cache `eval-cache` per day.

### Section 2 — Observations

- Observations grouped by date (collapsible). Past dates auto-collapsed. Date subheader shows that day's daily question.
- Observation cards: title + body + date badge. Hover/touch: "→ Source" (external link), "→ Add to thesis" (ObservationTruthPickerModal → PATCH `appendObservationId`).
- **Synthesize button** (visible when ≥3 observations) → `SynthesizeObservationsModal`: calls `/api/agent/propose`, shows thesis + reasoning + supporting obs. Create → POSTs to `/api/truths`. LocalStorage cache `propose-cache` per day. Re-run ↺ button in footer.

### Section 3 — Contrarian Theses

- Filter tabs: active | validated | invalidated.
- **Status lifecycle**: `forming → validated → (lifestyle_pass = true) → ReadyCard`. No `confident` status.
- **TruthCard** (forming):
  - Conviction pips (1–5, clickable → PATCH `conviction_level`)
  - Thesis text (italic quote) + proven_market excerpt (80 char truncated, expandable)
  - Supporting obs count + conviction label + date
  - Hover/touch: "Advance →" (inline dialog: proven_market textarea → PATCH `{ status: 'validated', proven_market }`), "Invalidate" (PATCH `{ status: 'invalidated' }`)
- **TruthCard** (validated, no lifestyle_pass):
  - Same card, "Lifestyle →" button instead of Advance
  - Inline manual lifestyle: Dialog with 5 checkboxes, Q2 labelled "required", pass counter → PATCH `{ lifestyle_pass, lifestyle_results }`
- **ReadyCard** (validated + lifestyle_pass = true): read-only, green accent, thesis + proven_market + 5 lifestyle results ✓/✗ + "Ready to Build" badge.
- **Header buttons** (tab-aware):
  - active tab + forming theses → "Validate →" → `ValidateThesisModal`
  - validated tab + unassessed (validated + no lifestyle_pass + proven_market set) → "Lifestyle →" → `LifestyleFilterModal`
  - Always: "+ Form Thesis" → `AddTruthModal`
- **ValidateThesisModal**: carousel of forming theses (conviction DESC). Per thesis: `/api/agent/validate` → auto-fills proven_market textarea. Editable. "Validate →" saves. 3-step progress animation. Cache `validate-cache`.
- **LifestyleFilterModal**: carousel of validated-unassessed theses (must have `proven_market` set). Per thesis: `/api/agent/lifestyle`. 3-step progress. Results: 5 ✓/✗ + reasoning. "Accept" → PATCH truth + mutate. Cache `lifestyle-cache`.

### Modals Summary

| Modal                       | Trigger                                  | API                                     |
| --------------------------- | ---------------------------------------- | --------------------------------------- |
| AddInputModal               | "+ Log Input", inline "+ add"            | POST /api/inputs                        |
| AddObservationModal         | "→ Observe" on card, "+ Capture"         | POST /api/observations                  |
| AddTruthModal               | "+ Form Thesis", from SynthesizeModal    | POST /api/truths                        |
| AgentRunModal               | "Run Agent" button                       | POST /api/agent/run                     |
| EvaluateSignalsModal        | "Evaluate" button                        | POST /api/agent/evaluate (streaming)    |
| SynthesizeObservationsModal | "Synthesize" button                      | POST /api/agent/propose                 |
| ValidateThesisModal         | "Validate →" header button               | POST /api/agent/validate                |
| LifestyleFilterModal        | "Lifestyle →" header button              | POST /api/agent/lifestyle               |
| ObservationTruthPickerModal | "→ Add to thesis" on obs card            | PATCH /api/truths (appendObservationId) |
| MarketConfigModal           | "Edit sources & name" in header dropdown | PATCH /api/markets                      |
| DigestModal                 | Digest button (currently disabled)       | POST /api/digest                        |

### localStorage Keys

- `eval-cache` — EvaluateSignals results + synthesis, keyed by date
- `propose-cache` — proposed thesis + obs, keyed by date
- `validate-cache` — proposed_proven_market, keyed by `{thesisId}-{date}`
- `lifestyle-cache` — lifestyle questions + overall_pass, keyed by `{thesisId}-{date}`

### SWR Refresh Intervals

- `/api/stats` → 60s
- `/api/inputs` → 30s
- `/api/observations` → 30s
- `/api/truths` → 60s
- `/api/markets` (active) → no auto-refresh
- `/api/markets?all=1` → no auto-refresh

### Daily Question Rotation

7 questions rotate by `dayOfYear % 7`:

1. "Where is something growing fast but being served poorly?"
2. "What do people keep complaining about that no one has fixed?"
3. "Which market is 10x bigger than people think it is?"
4. "What belief do most people in this space hold that is wrong?"
5. "Where is the gap between what people pay for and what they actually need?"
6. "What would you build if you knew this trend continued for 5 more years?"
7. "Which problem keeps appearing in multiple places at once?"

### Database Schema

**signal_inputs**: `id, date, source, source_category (trends|complaints|indie|data), title, url, notes, tags[], created_at, market_id FK`
**observations**: `id, date, title, body, related_input_ids INT[], tags[], created_at, market_id FK`
**contrarian_truths**: `id, date, thesis, supporting_observations INT[], conviction_level (1–5), status (forming|validated|invalidated), proven_market TEXT, lifestyle_pass BOOLEAN, lifestyle_results JSONB, created_at, updated_at, market_id FK`
**markets**: `id, name, description, is_active BOOLEAN, created_at, updated_at`
**market_sources**: `id, market_id FK (CASCADE), source_type ('subreddit'), value, created_at`
**email_digests**: `id, recipient_email, digest_date, inputs_count, observations_count, status, sent_at`

All `market_id` columns self-migrate at cold-start via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

### Environment Variables

- `DATABASE_URL` — Neon Postgres
- `ANTHROPIC_API_KEY` — Claude API
- `PRODUCT_HUNT_TOKEN` — optional, for agent/run PH fetches
- `FEEDBACK_TO_EMAIL` — optional
- `SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM` — optional email delivery
- `RESEND_API_KEY, RESEND_SEGMENT_ID` — optional alternative email delivery

## Monetization

email-only — capture newsletter subscribers via the digest. No payment gate at launch.

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
