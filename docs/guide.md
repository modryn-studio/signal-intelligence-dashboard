# Signal Intelligence — How to Use This

---

## What this is

A personal thinking system. Not a reading list. Not a bookmark tool.

You're training yourself to notice what others miss — and capturing what you're building toward. The dashboard has three parts that work in sequence:

**Inputs → Observations → Contrarian Truths**

Most people consume. You're consuming with a question in mind:

> **"Where is something growing fast but being served poorly?"**

---

## The three parts

### 1. Inputs — What you consumed today

A signal is anything that made you pause. A complaint. A trend. A product gaining traction. A data point that surprised you.

You log it here before you lose it.

**Four categories:**

| Category | What it means | Where to find it |
|---|---|---|
| `trends` | Growing spaces, emerging patterns | Hacker News, Product Hunt, a16z/Sequoia/YC blogs |
| `complaints` | Broken things people are stuck with | Reddit (r/entrepreneur, r/SaaS, niche subs), G2/Trustpilot 2–3 star reviews, App Store reviews |
| `indie` | Opportunities others already found | Indie Hackers, X — follow builders who share revenue and process |
| `data` | Search demand, raw usage signals | Google Trends, Exploding Topics |

**Fields:**
- **Source** — where you saw it (e.g. "Hacker News", "r/SaaS", "App Store")
- **Category** — one of the four above
- **Title** — one line: what's the signal
- **URL** — optional, but paste it if you have it
- **Notes** — optional, but this is where instinct lives. Write the "why does this matter" before you forget it
- **Tags** — optional labels to group across sessions (e.g. "productivity", "B2B", "no-code")

You need inputs before you can have observations. Start here every session.

---

### 2. Observations — Patterns you're starting to see

An observation is what happens when three inputs rhyme.

Not "I read something interesting." A genuine pattern — a repeated frustration, a gap that keeps appearing, a space everyone's ignoring.

**Fields:**
- **Title** — the pattern in one sentence
- **Body** — what you're seeing. Two to five sentences. No polish needed.
- **Related inputs** — link the signal inputs that sparked this (by ID — shown in the feed)
- **Tags** — optional; should match tags on relevant inputs so you can filter across both

**When to write one:**
You don't need to write one every day. Write one when something connects — when you look at three inputs and see the same gap underneath all of them.

---

### 3. Contrarian Truths — Beliefs you're forming

A contrarian truth is a thesis. Something you believe that most people in the space haven't caught up to yet.

It's not a hunch. It's what you're building toward.

**Fields:**
- **Thesis** — one or two sentences. The belief. State it plainly.
- **Supporting observations** — the observation IDs that back it up
- **Conviction level** — 1 (early, weak signal) to 5 (high conviction, ready to bet on it)
- **Status** — where you are in the arc:
  - `forming` — early, still gathering evidence
  - `confident` — multiple observations support it, pattern is clear
  - `validated` — real-world evidence confirmed it (a product shipped, a competitor moved, a market shifted)
  - `invalidated` — you were wrong. Log it. Understand why.

Truths should be hard to say out loud. If everyone already agrees with it, it's not contrarian — it's consensus.

---

## Daily workflow

**Session starts here:**

1. Open the dashboard
2. Check today's inputs (left column) — what's already here from earlier?
3. Browse your sources with the focusing question in mind
4. Log 2–5 inputs. Pick a category. Write a note on anything that stings.
5. Look across today's inputs. Do any connect? If yes, write an observation.
6. Check your active truths (right column). Does anything you saw today update your conviction level?

That's it. 10–20 minutes. Do it daily and the patterns surface in weeks, not months.

---

## Weekly digest

`POST /api/digest` with `{ "email": "you@example.com" }`

Generates an HTML email preview with:
- Today's inputs organized by category
- Today's observations
- Your top 5 active theses by conviction level
- Stats: how many inputs, observations, and active theses

The email isn't sent automatically — you trigger it. That's intentional. The digest should be a conscious act, not background noise.

> Email delivery (Resend) is wired in as the next step. For now, the endpoint returns a full HTML preview you can copy.

---

## Filtering

All feed views support filtering by tag:

- `GET /api/inputs?tag=productivity` — inputs tagged "productivity"
- `GET /api/inputs?date=2026-03-25&category=complaints` — complaints from a specific date
- `GET /api/observations?tag=B2B` — observations tagged "B2B"

Use consistent tags across inputs and observations to build a cross-session thread.

---

## The arc

```
Input          →    Observation      →    Contrarian Truth
(what you saw)      (pattern forming)     (the bet)
```

Most people stop at input. They consume and move on.

The observation layer is where judgment develops. The contrarian truth is where conviction becomes actionable.

The goal isn't a full dashboard. The goal is one truth you're willing to build on.

---

_Last updated: March 25, 2026_