# Project Context

## Core Framework

Market: Solo analysts, indie researchers, and product builders who track market signals daily.

Reference product (what people pay for): Bloomberg Terminal, Feedly Pro, Refind. The common thread — people pay for curated signal with less noise.

Your angle: Personal intelligence system you own and control. No subscriptions, no vendor lock-in. Raw SQL, raw observations, raw contrarian bets — all yours.

## Product

A private dashboard for ingesting market signals, logging observations, and crystallizing contrarian truths. Three-column layout: signal feed → observations → truths. Weekly email digest output.

## Target User

A solo founder or product builder who reads a lot, thinks they spot things others miss, and wants a system to prove it over time instead of letting insights evaporate in a chat thread.

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
