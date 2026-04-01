# Signal Intelligence — Copilot Context

## Who I Am

Luke Hanner is a solo developer shipping AI-assisted tools for indie founders. Signal Intelligence is a personal daily intelligence system organized around markets. Each market is a separate workspace — every signal, observation, and thesis scoped to it. New users go through an excavation onboarding (interest tags → Claude web search → 4 market options) to discover which market fits them. Once inside, a 7-step pipeline moves them from market definition → signal gathering → observations → contrarian theses → validation (proven market research) → lifestyle filter (5-criteria solo viability check) → Ready to Build. Built for solo developers who already know how to build — but are still figuring out what to build.

## Deployment

<!-- Filled in by /setup from context.md.
     Read this before touching next.config.ts, BASE_PATH, site.ts, or any hardcoded URL.
     If mode is modryn-app:         basePath must stay set in next.config.ts.
     If mode is standalone-*:       basePath must be absent from next.config.ts. -->

mode: standalone-domain
url: https://www.modrynstudio.com/tools/signal-intelligence
basePath: (empty — standalone deployment)

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS for styling
- Vercel for deployment
- Vercel Analytics `<Analytics />` in `layout.tsx` — zero-config pageview tracking, no env vars needed
- `@/lib/analytics.ts` — no-op stub with named methods; wire in a real provider here if needed
- `@neondatabase/serverless` — Neon Postgres via tagged SQL template literals (`sql` tag)
- `@anthropic-ai/sdk` — Anthropic Claude (`claude-sonnet-4-6`) for agent-based signal gathering
- `swr` — client-side data fetching for dashboard panels (refresh every 60s)
- `recharts` — charts for stats panel
- `next-themes` — light/dark mode toggle (defaults to system preference)

## Project Structure

```
/app                    → Next.js App Router pages + API routes
  /onboard              → Excavation onboarding (4-screen: interests → confirm broad markets → market picking → sources)
  /market/[id]          → Per-market dashboard — activates market on mount
  /api/markets          → CRUD markets + market_sources; self-migrates tables
  /api/inputs           → Signal inputs CRUD — market-scoped
  /api/observations     → Observations CRUD — market-scoped
  /api/truths           → Contrarian truths CRUD — market-scoped
  /api/stats            → Aggregate stats (?marketId param)
  /api/digest           → Digest generation (preview + optional email delivery)
  /api/feedback         → Feedback + newsletter signup
  /api/agent/run        → Fetch + filter signals via Claude — market-aware
  /api/agent/evaluate   → Deep evaluate signals (streaming NDJSON)
  /api/agent/propose    → Synthesize observations → proposed thesis
  /api/agent/validate   → Research proven market for a thesis
  /api/agent/lifestyle  → 5-filter solo lifestyle assessment
  /api/agent/excavate         → Onboarding — generate 4 market options from tags/description
  /api/agent/discover-sources → Find subreddits + product pages for a market (streaming NDJSON)
/components             → Dashboard panels, modals, and shadcn/ui primitives
/lib                    → db.ts (Neon), types.ts, route-logger.ts, analytics.ts, utils.ts
/hooks                  → use-mobile.ts, use-toast.ts
/config                 → site.ts — single source of truth for site metadata
schema.sql              → one-time Neon DB bootstrap (already run)
```

## Route Map

- `/` → Market gate — fetches `/api/markets?all=1`; 0 markets → `/onboard`, 1 market → `/market/[id]`, 2+ → inline `<MarketPicker>` sorted by signal count; no localStorage flags
- `/onboard` → Excavation onboarding — 4-step flow: **Screen 1** freetext + interest chips → `/api/agent/interpret` (~3s); **Screen 1b** confirm 2–4 broad market categories → `/api/agent/excavate` (ExcavateLoading, ~45–60s, 55s ease-out progress bar); **Screen 2** 4 market cards with demand badges + inline steer refinement (steer re-calls excavate without tools, fast); **Screen 3** discover-sources streams subreddits → "Start scanning →" creates market + fires agent silently with marketId → `/market/[id]`
- `/market/[id]` → Per-market dashboard — PATCHes market active on mount (atomic SQL); renders `<DashboardHeader marketId={id}>` immediately, gates `<DashboardLayout>` behind PATCH completion
- `/api/markets` → CRUD markets + market_sources; self-migrates tables at cold-start; PATCH activation is atomic single-statement (`is_active = (id = $id)`)
- `/api/inputs` → CRUD for signal inputs — market-scoped via `getActiveMarketId()`
- `/api/observations` → CRUD for observations — market-scoped; stores `related_input_ids INT[]`
- `/api/truths` → CRUD for contrarian truths — market-scoped; status lifecycle: `forming → validated → invalidated`; `proven_market TEXT`, `lifestyle_pass BOOLEAN`, `lifestyle_results JSONB`
- `/api/stats?today={date}&marketId={id}` → Aggregate stats — prefers `marketId` param over `is_active` lookup to avoid stale cache on market navigation
- `/api/digest` → POST `{ email }` — generates HTML digest scoped to active market; inserts to `email_digests`; requires Resend/SMTP env vars for actual delivery
- `/api/feedback` → POST — feedback + newsletter signup
- `/api/agent/run` → POST `{ today }` — market-aware: injects market name+description as focus filter; fetches HN, PH, Indie Hackers, r/SaaS, r/Entrepreneur + custom subreddits; Claude selects ~10 relevant; stamps `market_id`
- `/api/agent/evaluate` → POST — streaming NDJSON; evaluates in batches of 5; fetches real source content (Reddit JSON, HN Algolia, article HTML); web_search conditional — skipped when content fetched (60s timeout), used as fallback (`web_search_20250305`, max 1 use, 45s) only when content empty; synthesis call has no tools (pure inference, 60s timeout); cached in localStorage by date
- `/api/agent/discover-sources` → POST `{ market_name, micro_niche, description?, existing_subreddits? }` — streaming NDJSON; Claude with no tools (pure inference, 60s timeout, ~10s actual); returns subreddits; in-flight dedup per market_name
- `/api/agent/interpret` → POST `{ text }` — Claude (no tools, 512 max_tokens) reads freetext, surfaces 2–4 broad market categories; streams `{type:'market', data:{market, reason}}` chunks; server-side 24h cache + client localStorage day-scoped cache
- `/api/agent/propose` → POST — reads last 30 observations; Claude returns `{ thesis, supporting_observations, conviction_level, reasoning }`; cached by date
- `/api/agent/validate` → POST `{ thesis }` — Claude (no web search) returns `{ proposed_proven_market }`; cached by thesis ID + date
- `/api/agent/lifestyle` → POST `{ thesis, proven_market }` — Claude scores 5 filters; Q2 (recurring revenue) is knockout; returns `{ questions, overall_pass }`; cached by thesis ID + date
- `/api/agent/excavate` → POST `{ broadMarkets: string[], description?, steer?, existingMarkets? }` — normal path: Claude with `web_search_20260209` (max 2 uses, ~$0.15, ~45–60s) returns 4 market cards with demand badge, price range, top_pick; steer path: no tools, fast, not cached

## Brand & Voice

**Voice rules:**

- Short sentences. Direct. No setup. Every word earns its place.
- Confident without being arrogant. This tool knows what it is.
- Honest about what doesn't exist yet. No fake polish on unfinished things.
- Never use: "powerful, seamless, revolutionary, unlock, supercharge, next-level, game-changing, robust"

**Target User:**
A solo developer who knows how to build but doesn't yet know what to build. Disciplined, impatient with noise, optimizing for freedom over growth. They want a system that trains them to see — not another dashboard that dumps data on them.

**Visual Rules:**

- Light and dark mode. Defaults to system preference. Theme toggle in the dashboard header.
- Fonts: Inter (body, headlines) + JetBrains Mono (badges, tags, code, timestamps) + Playfair Display (daily question — serif italic in signal feed header).
- Motion: Minimal. Subtle fade on load. Nothing moves unless it has to.
- Avoid: no gradients, no blue of any shade, no decorative illustrations, no stock photos.
- Burnt orange (`oklch(0.62 0.14 38)` dark / `oklch(0.52 0.14 38)` light, hue 38) is the single identity color.
- Dark mode is neutral graphite — zero chroma surfaces. Depth order: column-flank `oklch(0.12 0 0)` → background `oklch(0.16 0 0)` → card `oklch(0.21 0 0)`. Orange pops against neutral, not warm-tinted, backgrounds.
- Desktop: three-column layout (signal feed / observations / theses). Mobile: single-panel with bottom tab nav switching between columns.
- Action buttons on cards are hidden behind hover on desktop. On touch devices (`@media (hover: none)`) they are always visible.
- Active filter tabs: outlined only — `border-foreground/60 text-foreground`, no background fill.
- Card borders in dark: neutral at rest, orange (`border-primary`) on hover for observation cards.

**Emotional Arc:**

- Land: "This is exactly what I needed and didn't know existed."
- Read: "This person thinks the way I think."
- Scroll: "I want to use this today."
- Convert: "I'm building this into my daily routine."

**Copy Reference:**

- Hero: "Train yourself to see what others miss."
- CTA: "Start observing."
- Daily prompt: "Where is something growing fast but being served poorly?"
- Weekly digest: "What you spotted. What it means. What you'd bet on."
- Empty state: "Nothing here yet. Drop a signal."
- Footer: "Built by Luke. For the 0.1% who consume signal, not noise."
- Error: "Something went wrong. Refresh and try again."

## README Standard

Every project README follows this exact structure — no more, no less:

```markdown
![Project Name](public/brand/banner.png)

# Project Name

One-line tagline. Outcome-focused — lead with what the user gets, not the technology.

→ [domain.com](https://domain.com)

---

Next.js · TypeScript · Tailwind CSS · Vercel
```

Rules:

- **Banner image** — always first. Path is `public/brand/banner.png`.
- **H1 title** — product name only, no subtitle.
- **Tagline** — one sentence. What the user gets. No buzzwords ("powerful", "seamless", "AI-powered").
- **Live link** — `→ [domain.com](https://domain.com)` format. Always present if live.
- **Divider** — `---` separator before the stack line.
- **Stack line** — `·`-separated list of core tech only. No version numbers, no descriptions.
- **Nothing else.** No install instructions, no contributing section, no architecture diagrams, no screenshots beyond the banner. Real docs go in `/docs` or on the live site.

When adding a badge row (optional, for open source tools/libraries only):

- Place it between the H1 and the tagline
- Use shields.io format: `[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)`
- Keep it to 3 badges max: typically license + CI status + live site
- Apps (not libraries) should skip badges entirely

## Tailwind v4

This project uses Tailwind CSS v4. The rules are different from v3 — follow these exactly.

**Design tokens live in `@theme`, not `:root`:**

<!-- Note: this project uses OKLCH color format and dual light/dark mode.
     :root = light mode tokens, .dark = dark mode tokens (see globals.css).
     The @theme block below bridges to the boilerplate token aliases. -->

```css
/* ✅ correct — generates text-primary, bg-card, border-border, etc. */
@theme {
  --color-primary: oklch(0.62 0.14 38); /* burnt orange — dark mode CTAs and identity */
  --color-background: var(--background); /* bridges :root token to TW utility */
  --color-card: var(--card); /* elevated surface — panels, modals */
  --color-border: var(--border); /* dividers, input outlines */
  --color-muted-foreground: var(--muted-foreground); /* secondary text */
  --font-heading: var(--font-sans); /* Inter */
}

/* ❌ wrong — :root creates CSS variables but NO utility classes */
:root {
  --color-primary: oklch(0.62 0.14 38);
}
```

**Use `(--color-*)` shorthand in class strings — never `[var(--color-*)]`:**

```tsx
// ✅ correct — TW v4 native shorthand
<div className="border-(--color-border) bg-(--color-surface) text-(--color-muted)" />

// ❌ wrong — v3 bracket notation, verbose and unnecessary in v4
<div className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]" />
```

If tokens are defined in `@theme`, you can also use the short utility names directly:

```tsx
// ✅ also correct when @theme is properly set up
<div className="border-border bg-surface text-muted text-accent" />
```

Never add `tailwind.config.*` — v4 has no config file. All theme customization goes in `globals.css` under `@theme`.

## API Route Logging

Every new API route (`app/api/**/route.ts`) MUST use `createRouteLogger` from `@/lib/route-logger`.

```typescript
import { createRouteLogger } from '@/lib/route-logger';
const log = createRouteLogger('my-route');

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    log.info(ctx.reqId, 'Request received', {
      /* key fields */
    });
    // ... handler body ...
    return log.end(ctx, Response.json(result), {
      /* key result fields */
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- `begin()` prints the `─` separator + START line with a 5-char `reqId`
- `info()` / `warn()` log mid-request milestones
- `end()` logs ✅ with elapsed ms and returns the response
- `err()` logs ❌ with elapsed ms
- Never use raw `console.log` in routes — always go through the logger

## Analytics

Vercel Analytics (`<Analytics />` in `layout.tsx`) handles pageviews automatically — no config needed.

`@/lib/analytics.ts` is a no-op stub with named methods. Add a named method for each distinct user action — keeps events typed and discoverable. Wire in a real provider (PostHog, Mixpanel, etc.) inside `analytics.ts` if custom event tracking is needed later.

```typescript
import { analytics } from '@/lib/analytics';
analytics.track('event_name', { prop: value });
```

**Vercel plan check required before adding custom events.** Custom events require Vercel Pro ($20/mo) — they do not appear in the Vercel Analytics dashboard on Hobby. Adding real event calls without an upgraded plan creates dead code that misleads future readers. Before instrumenting scroll depth, click events, conversion tracking, screenshot views, or any custom event: confirm the plan. If on Hobby, keep `analytics.ts` as a no-op stub until the plan is upgraded or a different provider is explicitly wired in. Do not add GA4 or PostHog without explicit instruction — keep it simple.

## Dev Server

Start with `Ctrl+Shift+B` (default build task).
This runs:

```
npm run dev -- --port 3000 2>&1 | Tee-Object -FilePath dev.log
```

Tell Copilot **"check logs"** at any point — it reads `dev.log` and flags errors or slow requests.

## Code Style

- Write as a senior engineer: minimal surface area, obvious naming, no abstractions before they're needed
- Comments explain WHY, not what
- One file = one responsibility
- Prefer early returns for error handling
- Never break existing functionality when adding new features
- Leave TODO comments for post-launch polish items

## Core Rules

- Every page earns its place — no pages for businesses not yet running
- Ship fast, stay honest — empty is better than fake
- Ugly is acceptable, broken is not — polish the core action ruthlessly
- Ship one killer feature, not ten mediocre ones
- Instrument analytics before features — data from day one
- Onboard users to value in under 2 minutes
- **Local-first by default** — no accounts, no data stored server-side, pay only when you use it. This is a brand-level commitment across every product, not a feature toggle.

## Positioning Decision: AI

Do NOT lead with "AI" in copy or headlines. The backlash is real and targets AI hype, not useful tools. Lead with outcomes and the user's problem. AI is an implementation detail, not a selling point.

- ✅ "Tools for people who don't have time for bad software"
- ✅ "I did the research so you don't have to"
- ❌ "AI-powered", "AI-first", "built with AI"

Products use AI internally. The marketing never needs to say so.
