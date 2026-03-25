# Reference Implementations — Signal Intelligence Dashboard

Scanned March 25, 2026. Findings from GitHub OSS research before building core features.

---

## What Was Scanned

- **worldmonitor** (43.9k stars) — 435+ AI-curated signal feeds, globe viz, finance radar. Pull-based, no user journaling.
- **miniflux/v2** (8.9k stars) — Go RSS reader, Postgres, background scheduler. Gold standard for feed ingestion + URL handling.
- **djedi/DailyNotes** (714 stars) — Full-stack journal. Tags as separate meta table rows with kind enum.
- **tt-rss** (672 stars) — PHP feed aggregator. Parallel daemon feed fetcher. OPML import.
- **josh-a-rubio/news-bot** — Production newsletter pipeline: RSS -> Notion curation checkbox -> weekly HTML email via SMTP.
- **remcostoeten-dashboard** (15 stars) — Next.js 15 + Drizzle personal dashboard. On hold; cautionary scope-creep example.
- **MISP/misp-dashboard** (206 stars) — Threat intel ZMQ feeds -> Flask+Redis. Multi-source correlation pattern.

---

## Key Findings

### The gap is real
- No OSS project combines: signal feed logging + observation journaling + contrarian thesis tracking + weekly digest.
- The combination is the product. Each piece exists in isolation elsewhere; nobody assembled it as a thinking tool.

### Architecture is validated
- Next.js App Router + Postgres tagged SQL + SWR at single-user scale: confirmed correct by remcostoeten-dashboard (same stack).
- Postgres TEXT[] for tags: correct for single-user. DailyNotes uses a separate meta table -- overkill.
- Conviction level + status state machine for truths: nothing OSS does it better or differently.
- Manual input (not automated RSS): miniflux proves automated ingestion is a full product on its own. The manual constraint is the point.

### Patterns worth stealing

- **Tag filtering** (from miniflux): `WHERE $1 = ANY(tags)` on a TEXT[] column. No schema change needed. Add `?tag=` param to GET /api/inputs and GET /api/observations.
- **Digest pipeline shape** (from josh-a-rubio/news-bot): curate -> build HTML -> send via API -> log result. The /api/digest route already builds HTML and logs to email_digests. Missing: the send call.
- **Email service** (from boilerplate .env.local.example): Resend is the standard. RESEND_API_KEY + RESEND_FROM_EMAIL already documented in boilerplate. Not needed for V1 -- digest preview works as a manual copy-paste.
- **URL metadata** (from miniflux): fetch og:title/og:description when URL is submitted. SSRF risk on server-side fetch -- miniflux has explicit private IP blocking. Safest option: hosted metadata API (linkpreview.net, opengraph.io). Defer to after email is wired.

---

## Decisions

### Gap 1 -- Email delivery: deferred
- Digest HTML generation works. The /api/digest POST returns a full preview.
- Real sending will use Resend (already in boilerplate env template: RESEND_API_KEY, RESEND_FROM_EMAIL).
- Wire it when the digest loop needs to run hands-off. Not a V1 blocker.

### Gap 2 -- Tag filtering: IMPLEMENTED
- Added `?tag=` query param to GET /api/inputs and GET /api/observations.
- SQL pattern: `WHERE ($tag = ANY(tags))` -- works natively with Postgres TEXT[].
- No schema change required.
- Combinable with existing `?date=`, `?category=`, `?limit=` params on inputs.

### Gap 3 -- URL metadata prefill: deferred
- Inputs accept a URL field but nothing pre-fills title/notes from OG tags.
- When built: client calls a new `POST /api/fetch-metadata` route with the URL.
- Server validates URL is not a private IP (SSRF protection per miniflux pattern), fetches OG tags, returns { title, description, image }.
- Use a hosted metadata API (linkpreview.net / opengraph.io) to avoid running server-side SSRF risk ourselves.
- Defer until after email is wired and the core loop is proven.

---

## What to Skip (Explicitly)

- Automated RSS feed ingestion -- miniflux is the reference; it's a full product. Not the goal here.
- Multi-user support -- single user forever.
- Encryption at rest -- DailyNotes AES-encrypts everything; overkill for personal tool.
- Vercel Cron auto-digest -- manual trigger is correct. Don't automate what should be a conscious act.
- OPML import -- V2+ territory.
- Plugin/webhook system -- miniflux has 25+ integrations; way too much for V1.

---

_This file is research scaffolding. Not maintained after features ship._