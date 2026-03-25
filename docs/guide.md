# Signal Intelligence — Usage Guide

---

## What this is for

You are using this dashboard for 3–5 days as a real user, not a tester. The goal is to find a contrarian truth — a belief about a market that most people have not caught up to yet.

Three columns. One direction of travel:

- **Left — Signal Inputs.** What you noticed today.
- **Center — Observations.** Patterns you are starting to see across multiple signals.
- **Right — Contrarian Truths.** Beliefs you are forming from repeated observations.

The system is designed to move information left to right. A signal becomes an observation. An observation becomes a thesis. That is the only path.

---

## Before you start — what to track

At the end of each day, note these four numbers somewhere. A note app is fine.

1. How many signals did the agent log?
2. How many of those did you turn into observations?
3. How many observations did you attach to a thesis?
4. How many theses advanced from Forming to Confident?

After 3–5 days, that funnel tells you where the system is working and where it leaks.

---

## Day 1 — Learn the full chain

Do this once on your first session so you know how everything connects.

### 1. Read the daily question

At the top of the page, under "Signal Intelligence", there is a question in italics. It changes once a day at midnight and cycles through 7 questions. Examples:

- _"Where is something growing fast but being served poorly?"_
- _"What do people keep complaining about that no one has fixed?"_
- _"What belief do most people in this space hold that is wrong?"_

Hold it in mind while you work. Every signal you log should be relevant to it.

### 2. Run the agent

Click **Run Agent** in the top right of the left column.

It fetches recent posts from Hacker News, Product Hunt, Indie Hackers, r/SaaS, and r/Entrepreneur, filters them against today's question using Claude, and logs the most relevant ones. Takes 15–30 seconds. The button shows how many were logged when it finishes.

Agent-logged items are tagged `agent`. They appear in the signal feed like any other input.

### 3. Look at what the agent found

Scan the signal cards. For each one, ask: does this represent a real complaint, a real gap, or a real question that is not being answered well?

If yes — hover over the card. A **→ Observe** button appears.

### 4. Click → Observe on something worth noting

The observation modal opens pre-filled:

- The **body** field contains the signal title. This is your starting point, not your ending point.
- Rewrite it or add to it. What is the pattern this signal is part of? What have you seen before that rhymes with this?
- Add a **title** that names the pattern, not the signal. Example: instead of "HN post about Notion being slow", write "Performance complaints about collaboration tools are rising and unsolved."
- Add tags if you have a recurring theme (e.g. `performance`, `b2b`, `onboarding`).

Click **Save Observation**. It appears in the center column.

### 5. Click → Add to thesis on that observation

Hover over the observation card. Click **→ Add to thesis**.

A picker opens showing your active theses (Forming and Confident). Two options:

- **Click an existing thesis** — the observation attaches to it. The thesis card shows an updated observation count.
- **+ Create new thesis** at the bottom — opens the thesis form with the observation ID already linked. Fill in your belief, pick a conviction level, submit.

The truth card in the right column will show "1 obs" under the conviction level. That number is your evidence count.

You have just run the full chain: Signal → Observation → Thesis.

---

## Every day after that — the daily sequence (10–20 minutes)

### 1. Read the daily question

It may have rotated since yesterday. Either way, re-read it before doing anything else.

### 2. Run the agent or browse manually

**Run Agent** — click the button, wait 15–30 seconds, review what it found.

**Browse manually** — use the six quick-access links below the category tabs in the left column (Hacker News, Product Hunt, Indie Hackers, Exploding Topics, r/SaaS, r/Entrepreneur). Open in a new tab, browse, come back and log what you find with **+ Log Input**.

Aim for 3–8 signals per session. Quality matters more than quantity.

### 3. Log anything the agent missed that caught your eye

Click **+ Log Input** and fill in:

- **Category** — Trends / Pain / Indie / Raw
- **Source** — pick the matching source pill
- **What did you find?** _(required)_ — one sentence
- **URL** _(optional)_
- **Notes** _(optional but important)_ — one sentence on why this caught your attention. Write it now before you forget.
- **Tags** _(optional)_ — use consistent tags so you can connect signals to observations later

### 4. Look across all of today's signals

Do not look at each signal in isolation. Look at the group. Ask: what are three or four of these saying that they have in common?

If a pattern is visible — hover a signal, click **→ Observe**, write the pattern, not the signal.

If a pattern is not visible yet — that is fine. Observations are not daily obligations. They are triggered by convergence.

### 5. Review your active theses

Open the right column. Look at each Forming and Confident thesis.

Did anything you saw today strengthen it? If yes, hover the relevant observation and click **→ Add to thesis** to attach it.

Did anything today contradict it? Update your conviction level or click **Invalidate**.

Did a thesis accumulate 3+ observations? Consider clicking **Advance →** to move it from Forming to Confident.

### 6. Note your four numbers for the day

Before you close the tab, record:

1. Signals logged (agent + manual)
2. Signals turned into observations
3. Observations attached to a thesis
4. Theses advanced

---

## Signal card reference

Each signal card in the left column shows:

- **Title** — the signal, as a link if a URL was attached
- **Source badge** — where it came from
- **Category color** — green (trends), orange-red (pain), purple (indie), amber (raw)
- **Tags** — including `agent` if it was logged by the agent
- **Timestamp**
- **Notes** — why it matters, if you wrote one

**Hover** to reveal:

- **✕** — delete the card
- **→ Observe** — open the observation modal pre-filled with this signal

---

## Observation card reference

Each observation card in the center column shows:

- **Title** — the pattern name
- **Body** — the detail and connections
- **Date**
- **Tags**

**Hover** to reveal:

- **✕** — delete the observation
- **→ Add to thesis** — open the thesis picker

---

## Truth card reference

Each truth card in the right column shows:

- **Thesis** in quotes
- **Status badge** — Forming / Confident / Validated / Invalidated
- **Conviction level** — Hunch / Lean / Believe / Confident / Certain (1–5)
- **N obs** — how many observations are attached
- **Five dots** on the left — filled to your conviction level

**Hover** to reveal:

- **Advance →** — Forming → Confident → Validated
- **Invalidate** — marks it wrong, fades it out, keeps it in the record
- **✕** — delete permanently

**Filter by status** using the tabs above the list: Active, Validated, Invalidated.

---

## Stats and streak

The header shows:

- **Today** — inputs logged today
- **Observations** — total ever
- **Theses** — total ever
- **14-day streak** — one square per day. Dark green = 5+ inputs. Medium = 2–4. Faint = 1. Empty = nothing.

---

## Digest

Click **Digest** in the header. Enter your email. Click **Send Digest**.

It shows counts of what is in the system. Email delivery is not wired yet — treat it as a checkpoint, not an email.

---

## Light / dark mode

Top right corner of the header. Sun or moon icon.

---

## What to bring back after 3–5 days

Before Phase 2 of development starts, answer these questions from your actual usage:

1. **The funnel:** How many signals → how many observations → how many theses → how many advanced?
2. **Where did it stall?** Was it hard to find signals worth observing? Was it hard to connect observations to theses? Did no thesis feel worth advancing?
3. **Was the → Observe pre-fill useful?** Did the signal title give you a starting point, or did you erase it and start from scratch anyway?
4. **Was the thesis picker useful?** When you clicked "→ Add to thesis", did the list of existing theses make you think "yes, this fits"? Or did nothing feel like a match?
5. **Agent quality:** Of the signals the agent logged, how many were actually worth observing? What fraction felt like noise?

Those five answers shape what gets built next. Write them in a comment on GitHub Issue #2.

---

## What is not working yet

| Feature | Status |
| --- | --- |
| Logging signal inputs | ✅ Working |
| Run Agent (HN + Product Hunt + Indie Hackers + Reddit → Claude) | ✅ Working — requires `ANTHROPIC_API_KEY` in env |
| → Observe button on signal cards | ✅ Working |
| → Add to thesis button on observation cards | ✅ Working |
| Thesis picker with escape hatch | ✅ Working |
| Observation count on truth cards | ✅ Working |
| Filtering by category | ✅ Working |
| Stats and streak | ✅ Working |
| Digest preview (counts) | ✅ Working |
| Digest email delivery | ⏳ Not wired — Resend not connected |
| URL metadata auto-fill | ⏳ Not built — paste URL and write title manually |
| Agent reason field ("Flagged because...") | ⏳ Phase 2 — coming with the prompt rewrite |

---

_Last updated: March 25, 2026_