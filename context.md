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
url: https://v0-signal-intelligence-dashboard.vercel.app
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

## Project Structure Additions

- schema.sql — one-time DB bootstrap (already run in Neon)
- lib/db.ts — Neon singleton export
- lib/types.ts — shared TypeScript types
- app/api/ — six domain API routes (inputs, observations, truths, contrarian-truths, stats, digest)

## Route Map

- `/` → Main dashboard (3-column signal intelligence layout)
- `/api/inputs` → CRUD for signal inputs
- `/api/observations` → CRUD for observations
- `/api/truths` → CRUD for truths
- `/api/contrarian-truths` → CRUD for contrarian truths
- `/api/stats` → Aggregate stats for dashboard header
- `/api/digest` → Weekly digest generation
- `/api/feedback` → Feedback + newsletter signup (boilerplate standard)

## Monetization

email-only — capture newsletter subscribers via the digest. No payment gate at launch.

## Target Subreddits

r/SideProject, r/buildinpublic, r/Entrepreneur

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
