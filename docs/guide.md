# Signal Intelligence -- How to Use It

---

## The big picture

There are three columns on the page.

**Left -- Signals.** Stuff you found on the internet today. Raw material.

**Middle -- Observations.** Patterns you are starting to notice. Written in your own words.

**Right -- Theses.** Bold beliefs you are forming. Things you would bet money on.

The goal: move things from left to right. Signal becomes observation. Observation becomes thesis.

At the top of the page there is a question in italics. That is your focus for today. Everything you do should answer that question.

**On mobile:** tap the tabs at the bottom to switch between the three columns. Everything else is the same.

---

## Step 1 -- Read today's question

It is at the top of the page. Something like:

> "What do people keep complaining about that no one has fixed?"

Read it. Keep it in your head. Every signal you log and every observation you write should answer it.

---

## Step 2 -- Fill the left column with signals

You have two ways to do this.

### Option A -- Run the agent (fastest)

Click **Agent** in the top-right of the left column. Click **Run Agent**.

A progress window opens. Wait 15-30 seconds.

What it does: it reads recent posts from Hacker News, Product Hunt, Indie Hackers, r/SaaS, and r/Entrepreneur. It keeps only the ones that match today's question. Everything else is thrown away.

When it finishes, click **Deep Evaluate** to move to the next step.

### Option B -- Add signals yourself

Click **+ Log Input** in the top-right of the left column.

Fill in the form:

- **What did you find?** One sentence.
- **Category** -- Trends, Pain, Indie, or Raw.
- **Source** -- where you found it (Hacker News, Reddit, etc.).
- **URL** -- paste the link. Optional.
- **Notes** -- one sentence on why it caught your attention. Write this now. You will forget later.

Click **Save**.

Aim for 5-12 signals per session.

---

## Step 3 -- Evaluate the signals

Click **Agent** then **Deep Evaluate** in the left column header. Or click **Deep Evaluate** at the end of the Run Agent screen.

A window opens. Cards stream in one by one. Each card shows a verdict:

- **Observe** -- real gap. Worth saving.
- **Skip** -- interesting but not actionable.
- **Delete** -- noise.

At the top of the window, there is an **Analysis** section with three lines:

- Which signals are strongest and why
- The pattern linking them
- A thesis the agent thinks the signals support

There is a big button below the analysis:

> **Accept top signals + form thesis**

Click it. This saves the top signals as observations and creates a thesis in the right column -- all in one click. Done.

If you want to review cards one by one instead:

- Click **Accept** on any Observe card to save it as an observation.
- Click **Delete card** to remove noise.
- Ignore the Skip cards for now.

When you are done, click **Done**.

---

## Step 4 -- Turn any single signal into an observation yourself

You do not have to use the agent. You can do this by hand.

Hover over any signal card in the left column. Click **Observe**.

The observation form opens pre-filled. Edit it:

- **Title** -- describe the pattern, not the article. "Stripe fees are squeezing bootstrapped founders" not "Founder complains on Reddit."
- **Body** -- one or two sentences. What is actually happening and why it matters.

Click **Save Observation**. It appears in the middle column.

---

## Step 5 -- Turn your observations into a thesis

Once you have 3 or more observations saved, a **Synthesize** button appears in the top-right of the middle column.

Click it.

A window opens. It reads everything you have ever logged and looks for a pattern.

When it finishes, you will see:

- A proposed thesis -- a one-sentence contrarian belief
- Which observations support it
- How confident it is (1 = hunch, 3 = believe it)
- A short explanation

If it looks right, click **Create thesis**. The thesis appears in the right column.

If it missed the mark, click the Re-run button in the bottom-right corner.

To write a thesis yourself, close this window and click **+ Form Thesis** in the top-right of the right column.

---

## Step 6 -- Validate the thesis

This is the most important step. Most people skip it. Do not skip it.

Validation is not a feeling. It is evidence. There are three levels of evidence. You need at least two to advance a thesis.

Once you have any thesis (Forming or Confident status), a **Validate** button appears in the top-right of the right column.

Click it.

A window opens. The agent auto-picks your highest-conviction thesis and starts researching. Wait a few seconds.

The window has three sections.

### Level 1 -- Passive Evidence

The agent searches for competing products and pre-fills this for you. Review it. Edit if needed.

You are looking for: 3-5 products that exist and charge money. If someone built it and charges for it, that is proof the market exists. You do not need to validate what the market already validated.

Examples of what to write:

> Exploding Topics Pro ($49/mo), Trends.vc ($150/mo), SparkToro ($50/mo)

If the agent finds nothing, write what you know or leave it blank for now.

### Level 2 -- Active Evidence

A checkbox. Check it if you have found 20 or more people actively complaining about this problem online.

Look on Reddit, Twitter, Indie Hackers, or anywhere your target person lives. You are looking for complaints, workarounds, people duct-taping spreadsheets together, people hiring VAs to do something manually. Workarounds are the strongest signal. They mean the pain is real and unsolved cleanly.

An optional notes field appears when you check this. Paste a link or write where you found the complaints.

### The threshold

Both sections filled -- the button changes to **Save & Validate**. Click it to save and move the thesis forward (Forming to Confident, or Confident to Validated).

One section filled -- the button says **Save**. It saves what you have without advancing the status. Come back when you have more evidence.

A counter above the footer shows how many checks you have completed.

---

## Step 7 -- Link observations to theses manually

You do not have to use the automation. You can connect things by hand at any time.

**Attach an observation to a thesis:** hover over any observation card in the middle column. Click **Add to thesis**. A picker opens. Click the thesis you want to attach it to.

**Write a thesis yourself:** click **+ Form Thesis** in the right column header.

**Contradict an existing thesis:** hover over a thesis card. Click **Invalidate** to mark it wrong. It moves to the Invalidated archive so you can learn from it.

**Change conviction:** click the dots on the left side of any thesis card to change the conviction level (1-5).

---

## Step 8 -- Log your numbers before you close

Before you close the tab, note down:

1. How many signals did you log today?
2. How many became observations?
3. How many observations got attached to a thesis?
4. Did any thesis advance status today?

After 5 days, these numbers tell you exactly where things are getting stuck.

---

## What the cards look like

### Signal card (left column)

Title, source badge, category color, tags, timestamp, your notes.

Hover to see:

- **Observe** -- save as an observation
- **X** -- delete this card

### Observation card (middle column)

Title, body text, date, tags. Date group headers are collapsible.

Hover to see:

- **Source** -- links back to the original signal (only if the signal had a URL)
- **Add to thesis** -- attach to a thesis
- **X** -- delete

### Thesis card (right column)

Thesis text in quotes, status badge (Forming / Confident / Validated / Invalidated), conviction label (Hunch / Lean / Believe / Confident / Certain), observation count, five dot indicators.

If a proven market has been saved, it shows in small grey text below the thesis.

Hover to see:

- **Advance** -- moves the status forward. Greyed out on Confident theses until the proven market is filled in.
- **Invalidate** -- marks it wrong
- **X** -- deletes it permanently

---

## What the header numbers mean

- **Today** -- signals logged today
- **Observations** -- total observations ever
- **Theses** -- total theses ever
- **Streak** -- the row of small squares. Dark = you logged something that day.

---

## Other buttons

**Digest** -- a text summary of everything in the system. Useful for a weekly review.

**Sun/moon icon** -- light and dark mode toggle.

---

## What is and is not working

| Feature                                                | Status        |
| ------------------------------------------------------ | ------------- |
| Logging signal inputs                                  | Working       |
| Run Agent (HN + Product Hunt + Indie Hackers + Reddit) | Working       |
| Deep Evaluate (reads sources, drafts observations)     | Working       |
| Accept top signals + form thesis (one-click)           | Working       |
| Observe button on signal cards                         | Working       |
| Add to thesis on observation cards                     | Working       |
| Synthesize button (observations to thesis)             | Working       |
| Validate button (2-level evidence framework)           | Working       |
| Advance gated behind both evidence checks              | Working       |
| Stats and streak                                       | Working       |
| Digest preview                                         | Working       |
| Digest email delivery                                  | Not wired yet |
| URL metadata auto-fill                                 | Not built yet |

---

_Last updated: March 30, 2026_
