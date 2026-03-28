# Signal Intelligence — How to Use It

---

## What you are looking at

The page has three columns.

**Left column — Signal Inputs.** Things you found today. Think of it as a raw inbox.

**Middle column — Observations.** Patterns you are starting to see. One observation can come from many signals.

**Right column — Contrarian Truths.** Beliefs you are forming. Bold claims you would bet on.

The flow goes left to right. A signal becomes an observation. An observation becomes a thesis. That is the whole thing.

At the top of the page there is a question in italics — today's focus. Everything you do should be filtered through that question.

**On mobile:** the three columns are stacked. A tab bar at the bottom of the screen lets you switch between **Signals**, **Observe**, and **Theses**. Everything else works the same way.

---

## The daily routine

Set aside 10–20 minutes. Work through these steps in order.

---

### Step 1 — Read today's question

Look at the top of the page. There is a question in italics, something like:

> _"What do people keep complaining about that no one has fixed?"_

Read it. That is your lens for today. Every signal you log, every observation you write — ask yourself if it answers that question before you save it.

The question changes every day and cycles through 7 different prompts.

---

### Step 2 — Fill the left column with signals

You have two ways to do this. You can use one or both — it does not matter.

---

#### Option A — Run the agent (recommended, fastest)

Look at the top-right of the left column. You will see a button that says **Agent ▾**.

Click it. A small menu drops down. Click **Run Agent**.

A progress window opens. Wait. It will say how many signals it found when it finishes. Takes about 15–30 seconds.

**What it does:** It fetches recent posts from Hacker News, Product Hunt, Indie Hackers, r/SaaS, and r/Entrepreneur. Claude reads them and keeps only the ones that match today's question. The rest are thrown away.

When it finishes, you will see a button that says **→ Deep evaluate**. Keep that in mind — you will use it in the next step.

---

#### Option B — Add signals yourself (manual)

Below the category tabs in the left column, there are links: Hacker News, Product Hunt, etc. Click one and browse in a new tab.

When you find something interesting, come back and click **+ Log Input** (top right of the left column).

A form opens. Fill it in:

- **What did you find?** — one sentence. What is the signal.
- **Category** — pick one: Trends, Pain, Indie, or Raw.
- **Source** — where you found it (e.g. Hacker News).
- **URL** — paste the link. Optional but useful.
- **Notes** — one sentence on why this caught your attention. **Write this now.** You will forget by the end of the session.

Click **Save**. The card appears in the left column.

Aim for 5–12 signals per session. The agent typically returns around 12 — that is the right range.

---

### Step 3 — Let the agent evaluate the signals

This step is optional but it saves a lot of time.

Click **Agent ▾** → **Deep Evaluate**. Or if you just ran the agent, click **→ Deep evaluate** in the done screen.

A new window opens. Wait 60–120 seconds. The agent is reading the actual source content — Reddit threads, HN comment sections, full articles — and may run a web search for signals without a URL.

When it finishes, you will see:

**An Analysis section at the top.** Three short lines:

- **Accept first** — which 1–2 signal cards are the strongest and why.
- **Pattern** — the structural theme linking them, if any.
- **Thesis** — a contrarian belief the agent thinks these signals collectively support.

Below the Thesis line is the primary action:

> **✓ Accept top signals + form thesis**

Click it. This does three things at once:

1. Saves the top 1–2 signals as observations in the middle column.
2. Creates a Contrarian Truth in the right column using the Thesis line, already linked to those observations.
3. Shows a confirmation: "✓ 2 observations saved · thesis formed".

That is the full loop — signals → observations → thesis — in one click.

**Below the Analysis panel**, you will see the full list of signal cards with verdicts:

- **Observe** — real gap. The agent has drafted an observation for you.
- **Skip** — interesting but not actionable today.
- **Delete** — noise.

The tab defaults to showing only Observe cards. For each one the agent did not include in the top picks — read the reasoning. Click **✓ Accept** if you agree. Click **Delete card** to remove noise.

If you want to skip the Analysis and review everything yourself, click the **Analysis** header to collapse it.

Click **Done** when finished.

---

### Step 4 — Turn any signal into an observation yourself

You do not have to use Deep Evaluate. You can do this by hand for any signal card.

Hover over a signal card in the left column. Two buttons appear: **✕** and **→ Observe**.

Click **→ Observe**.

The observation form opens with fields pre-filled:

- The title is filled from the agent's note on that signal — rewrite it to describe the pattern, not the individual article.
- The body is filled from the signal's title — add context or rewrite it.

**The title matters most.** It should name the pattern, not the event.

- ❌ "Startup founder complains about Stripe fees on r/SaaS"
- ✅ "Stripe's pricing is squeezing bootstrapped founders at the $10k MRR stage"

Add tags if you have a recurring theme (e.g. `pricing`, `bootstrapped`). Click **Save Observation**.

It appears in the middle column.

---

### Step 5 — Link observations to a thesis

Hover over any card in the middle column. Click **→ Add to thesis**.

A picker opens. Two things you can do:

- **Click an existing thesis** to attach this observation to it. The thesis card will show an updated observation count.
- **Click + Create new thesis** if no existing thesis fits. The observation links automatically.

When you write a thesis, write it as a claim — something you would bet on, not just a description.

- ❌ "People are complaining about Stripe"
- ✅ "Payment processors are charging SaaS-level fees to people who are not yet doing SaaS-level revenue"

---

### Step 6 — Update your theses

Look at the right column. For each thesis in Forming or Confident status:

- Did anything from today strengthen it? Attach the observation.
- Did anything contradict it? Lower the conviction level or click **Invalidate**.
- Does it have 3+ observations attached? Click **Advance →** to move it from Forming to Confident.

A thesis without attached observations is just an opinion. A thesis with 3–5 attached observations is a position.

---

### Step 7 — Log your numbers before you close

Before you close the tab, note:

1. How many signals did you log today?
2. How many became observations?
3. How many observations got attached to a thesis?
4. Did any thesis advance (Forming → Confident)?

After 3–5 days, these numbers tell you exactly where the system is getting stuck.

---

## What each card looks like

### Signal card (left column)

Shows the title (clickable if there is a URL), a source badge, a color dot for the category, tags, the timestamp, and your notes.

**On desktop, hover** to see two buttons. **On mobile, they are always visible:**

- **✕** — delete this card permanently
- **→ Observe** — open the observation form pre-filled with this signal

---

### Observation card (middle column)

Shows the title, body text, date, and tags.

Date group headers (Today, Mar 26, etc.) are collapsible — click to collapse or expand a day. When collapsed, the header shows a count of how many observations are inside, e.g. `Mar 26 (3)`.

**On desktop, hover** to see two buttons. **On mobile, they are always visible:**

- **✕** — delete this observation permanently
- **→ Add to thesis** — open the thesis picker

---

### Thesis card (right column)

Shows the thesis text in quotes, a status badge (Forming / Confident / Validated / Invalidated), a conviction label (Hunch → Lean → Believe → Confident → Certain), a count of attached observations, and five dots filled to conviction level.

**On desktop, hover** to see. **On mobile, always visible:**

- **Advance →** — moves status forward: Forming → Confident → Validated
- **Invalidate** — marks it wrong. Keeps it in the record so you can learn from it.
- **✕** — deletes it permanently

Filter the right column by status using the tabs above it: Active, Validated, Invalidated.

---

## What the header numbers mean

- **Today** — how many signal inputs you have logged today
- **Observations** — total observations ever saved
- **Theses** — total theses ever created
- **14-day streak** — the row of small squares. Dark square = you logged something that day. Empty = nothing that day.

---

## Other buttons

**Digest** — shows a text summary of everything in the system. Useful for a weekly review. Email delivery is not wired yet.

**Sun / moon icon** — toggles light and dark mode. Top right of the header.

---

## After 3–5 days, answer these

Post your answers as a comment on GitHub Issue #2:

1. How many signals → observations → theses → theses advanced?
2. Where did it stall? Too few signals? Couldn't spot patterns? No thesis felt worth writing?
3. Did the Deep Evaluate verdicts feel accurate? How often was the agent wrong?
4. Did the pre-filled observation drafts save you time, or did you rewrite them anyway?
5. Did the thesis picker help you connect observations to existing beliefs, or did nothing feel like a fit?

---

## What is and is not working

| Feature                                                         | Status       |
| --------------------------------------------------------------- | ------------ |
| Logging signal inputs                                           | ✅ Working   |
| Run Agent (HN + Product Hunt + Indie Hackers + Reddit → Claude) | ✅ Working   |
| Deep Evaluate (agent reads source content, drafts observations) | ✅ Working   |
| Analysis panel (Accept first / Pattern / Thesis)                | ✅ Working   |
| ✓ Accept top signals + form thesis (one-click loop)             | ✅ Working   |
| Collapsible Analysis panel                                      | ✅ Working   |
| → Observe on signal cards                                       | ✅ Working   |
| → Add to thesis on observation cards                            | ✅ Working   |
| Thesis picker                                                   | ✅ Working   |
| Observation count on truth cards                                | ✅ Working   |
| Stats and streak                                                | ✅ Working   |
| Digest preview                                                  | ✅ Working   |
| Digest email delivery                                           | ⏳ Not wired |
| URL metadata auto-fill                                          | ⏳ Not built |

---

_Last updated: March 27, 2026_
