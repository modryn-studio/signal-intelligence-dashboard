# Signal Intelligence — Copilot Context

## Who I Am

Luke Hanner is a solo developer shipping AI-assisted tools for indie founders. Signal Intelligence is a personal daily dashboard for observing market signals, capturing insights, and forming contrarian theses over time. Built for solo developers who already know how to build — but are still figuring out what to build. The dashboard aggregates signal sources, prompts a single focusing question each day, and lets patterns surface through an observation log and contrarian truths tracker. Weekly email digest output.

## Deployment

<!-- Filled in by /setup from context.md.
     Read this before touching next.config.ts, BASE_PATH, site.ts, or any hardcoded URL.
     If mode is modryn-app:         basePath must stay set in next.config.ts.
     If mode is standalone-*:       basePath must be absent from next.config.ts. -->

mode: standalone-domain
url: https://v0-signal-intelligence-dashboard.vercel.app
basePath: (empty — standalone deployment)

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS for styling
- Vercel for deployment
- Vercel Analytics `<Analytics />` in `layout.tsx` — zero-config pageview tracking, no env vars needed
- `@/lib/analytics.ts` — no-op stub with named methods; wire in a real provider here if needed
- `@neondatabase/serverless` — Neon Postgres via tagged SQL template literals (`sql` tag)
- `swr` — client-side data fetching for dashboard panels (refresh every 60s)
- `recharts` — charts for stats panel
- `next-themes` — light/dark mode toggle (defaults to system preference)

## Project Structure

```
/app                    → Next.js App Router pages + 7 API routes
/components             → Dashboard panels, modals, and shadcn/ui primitives
/lib                    → db.ts (Neon), types.ts, route-logger.ts, analytics.ts, utils.ts
/hooks                  → use-mobile.ts, use-toast.ts
/config                 → site.ts — single source of truth for site metadata
schema.sql              → one-time Neon DB bootstrap (already run)
```

## Route Map

- `/` → Main dashboard — 3-column layout: signal feed, observations, contrarian truths
- `/api/inputs` → CRUD for signal inputs (URLs, articles, snippets)
- `/api/observations` → CRUD for observations with tags
- `/api/truths` → CRUD for truths / theses
- `/api/contrarian-truths` → CRUD for contrarian truth entries
- `/api/stats` → Aggregate stats for dashboard header streak display
- `/api/digest` → Weekly digest generation — email-ready summary
- `/api/feedback` → Feedback submissions + newsletter signup

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
- Fonts: Space Grotesk (headlines) + Space Mono (badges, tags, code, timestamps). Currently Inter + JetBrains Mono — migration pending.
- Motion: Minimal. Subtle fade on load. Nothing moves unless it has to.
- Avoid: no gradients, no blue of any shade, no decorative illustrations, no stock photos.
- Accent green (`oklch(0.75 0.18 142)` dark / `oklch(0.52 0.18 142)` light) is the single identity color.

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
/* ✅ correct — generates text-accent, bg-surface, border-border, etc. */
@theme {
  --color-accent: oklch(0.75 0.18 142); /* green signal color — dark mode primary */
  --color-secondary: oklch(0.72 0.19 27); /* orange-red — warnings, contrarian markers */
  --color-bg: oklch(0.10 0 0); /* near-black page background (dark) */
  --color-text: oklch(0.92 0 0); /* near-white body text (dark) */
  --color-muted: oklch(0.65 0 0); /* secondary text, placeholders */
  --color-surface: oklch(0.14 0 0); /* card/panel surface (dark) */
  --color-border: oklch(0.26 0 0); /* dividers, input outlines (dark) */
  --font-heading: var(--font-sans); /* Inter — Space Grotesk migration pending */
}

/* ❌ wrong — :root creates CSS variables but NO utility classes */
:root {
  --color-accent: oklch(0.75 0.18 142);
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
