# Project Context

## Core Framework

Market: Solo developers and indie builders optimizing for lifestyle and freedom — people who want to observe market signals intelligently before committing to a project.

Reference product (what people pay for): Exploding Topics Pro ($49/mo) — people pay to discover trending topics before they peak. Top complaint: too broad, not actionable for solo builders, no way to capture personal observations alongside the data.

Your angle: Same job (spot emerging opportunities) — but built as a personal intelligence system, not a trend database. Free, self-hosted, focused on one question: "Where is something growing fast but being served poorly?" No noise. No subscription. Yours.

---

## Product

Signal is a personal daily dashboard that aggregates market signal sources, prompts you with a single focusing question each day, and lets you capture and track observations over time — so patterns surface and contrarian insights emerge.

## Target User

A solo developer who wants to build a lifestyle business but doesn't know where to start. They're not looking for a trend report — they're trying to train themselves to see what others miss. They already know how to build. They don't yet know what to build.

## Deployment

mode: standalone-domain

url: https://signal-intelligence-dashboard.vercel.app
basePath:

## Minimum Money Loop

Personal tool — no money loop required at this stage.

## Stack Additions

- No additional services beyond Next.js, Tailwind, Vercel defaults
- Consider Vercel KV or localStorage for persisting observations client-side (no backend required for personal use)

## Project Structure Additions

- `/lib/sources.ts` → config for signal feed sources (HN, Product Hunt, Reddit, Exploding Topics)
- `/lib/observations.ts` → observation storage and tag logic

## Route Map

- `/` → Main dashboard — daily prompt, signal feed, observation capture, pattern tracker, validation scratchpad

## Monetization

- `none` → Personal tool, no email capture, no payment

## Target Subreddits

Not applicable — personal tool, no launch distribution planned.

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/signal-intelligence-dashboard
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
