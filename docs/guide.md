# Signal Intelligence — How to Use It

---

## What is this?

You pick a market. The app helps you watch it every day.

Over time, you go from "I don't know what to build" to "I know exactly who has this problem and someone already pays for a bad version of the solution."

Three columns. Left to right is the workflow.

- **Left column — Signals.** Things you found on the internet. Raw material.
- **Middle column — Observations.** Patterns you noticed. In your own words.
- **Right column — Theses.** Bold beliefs you are betting on.

The thing at the top of the page in italics? That is today's focus question. Try to answer it.

On mobile: tap the tabs at the bottom to switch columns.

---

## First time? Start here.

### Screen 1 — What are you into?

You see 12 tags. Pick up to 3. Or just type something in the box below.

Then click **Find my markets →**.

Wait about 15 seconds. Cards will appear.

### Screen 2 — Pick a market.

You see 4 cards. Each one is a type of person with a type of problem.

- The headline names the person. "Independent Restaurant Owners." "Freelance Video Editors."
- The body describes what frustrates them and what they already pay for.
- The price badge shows what people in this space spend on tools.
- The demand badge says if it is proven, growing, or crowded.

**Pick the one that feels most interesting to you.** You are not picking a product. You are picking a group of people to learn about. The product idea comes later.

If you hate all 4: click **None of these feel right — let me refine ›**. Pick some steer tags. Click **Regenerate →**.

### Screen 3 — Your signal sources.

The app finds subreddits and review pages for your market. They show up one by one.

All of them are toggled on by default. Turn off any you don't want.

Click **Start scanning →**.

That's it. You're in.

> If it's taking forever, click **Skip source discovery →** at the bottom and move on.

---

## Step 1 — Get some signals into the left column.

You have two ways.

### The fast way — run the agent.

Click **Agent ⌄** at the top of the left column. Click **Run Agent**.

Wait 15–30 seconds. The agent reads Hacker News, Product Hunt, Indie Hackers, Reddit, and your custom subreddits. It keeps only the stuff relevant to your market.

When it's done, click **→ Deep evaluate**.

### The manual way — log one yourself.

Click **+ Log Input** at the top of the left column.

Fill in:

- **What did you find?** One sentence.
- **Category** — Trends, Pain, Indie, or Raw.
- **Source** — Reddit, HN, Twitter, wherever.
- **URL** — paste the link. Optional.
- **Notes** — why did this catch your eye? Write it now. You will forget.

Click **Save**.

---

## Step 2 — Evaluate the signals.

Click **Agent ⌄** then **Evaluate**. Or click **→ Deep evaluate** after running the agent.

Cards appear one by one. Each one gets a verdict:

- **Observe** — real gap. Keep it.
- **Skip** — mildly interesting. Ignore for now.
- **Delete** — noise.

At the top of the window, after all cards load, you see an **Analysis** section:

- The strongest signals and why
- The pattern across them
- A thesis the data suggests

Below that: **Accept top signals + form thesis**.

Click it. Done. Your best observations are saved and a thesis is created automatically.

Want to do it card by card instead? Click **Accept** on an Observe card to save it. Click **Delete card** to trash it.

---

## Step 3 — Add an observation by hand.

Don't want to use the agent? Fine.

Hover any signal card. Click **→ Observe**.

The form opens pre-filled. Fix the title and body if needed.

- **Title** — describe the pattern. Not "founder complains on Reddit." More like "Stripe fees are killing bootstrapped apps."
- **Body** — two sentences. What's happening and why it matters.

Click **Save Observation**. It shows up in the middle column.

---

## Step 4 — Turn observations into a thesis.

Once you have 3 or more observations, a **Synthesize** button appears at the top of the middle column.

Click it.

The agent reads your observations and finds the pattern. It gives you:

- A one-sentence thesis — a bold contrarian belief
- Which observations back it up
- A confidence level (1–5)
- A short explanation

If it looks right: click **Create thesis**. It appears in the right column.

If it's wrong: click the **↺** button in the bottom-right to re-run.

Want to write one yourself? Close the window and click **+ Form Thesis** at the top of the right column.

---

## Step 5 — Validate the thesis.

This is the most important step.

You need proof that people already pay for something like this. Not a feeling. Evidence.

Click **Validate →** at the top of the right column.

The agent picks your first forming thesis and looks up competing products. It fills in the **Proven Market** field for you.

You're looking for: 3–5 products that exist and charge money.

> Example: "Vanta ($5k+/yr), Drata ($2k+/yr), Secureframe ($1k+/mo)"

If the agent misses something, edit the field yourself. Click **↺ Re-research** if you want it to try again.

When you're happy with it: click **Validate →**. The thesis moves from **Forming** to **Validated**.

---

## Step 6 — Run the lifestyle filter.

Validated theses still need one test: can you actually run this business alone?

Click **Lifestyle →** at the top of the right column (switch to the **Validated** tab first).

The agent scores your thesis against 5 filters:

1. **Solo maintainable** — one person can run it
2. **Recurring revenue day one** — makes money from the start _(must pass — this is a knockout)_
3. **VC-ignored TAM** — small enough that you can win
4. **Reachable first 20** — you can find your first customers without ads
5. **Boring enough for 5 years** — you won't hate it in 2030

You see ✓ or ✗ for each, with a one-line reason.

Pass? Click **Accept →**. The thesis becomes a **Ready to Build** card.

Fail? It tells you which filters failed. Click **↺ Re-analyze** to retry or check the boxes manually on the Validated thesis card.

---

## Other things you can do.

**Attach an observation to a thesis manually.** Hover an observation card. Click **Add to thesis**. Pick the thesis from the list.

**Switch markets.** Click the orange market name in the header (the one next to the date). A dropdown opens. Click any market to switch.

**Edit your market.** Same dropdown → **Edit sources & name**. You can rename it, update the description, or add/remove subreddits.

**Go back to all markets.** Dropdown → **All markets**.

**Start a new market.** Dropdown → **+ New market**. Takes you back to onboarding.

Each market is completely separate. Signals in one market don't bleed into another.

---

## Status

| Feature                          | Status | Notes                                                             |
| -------------------------------- | ------ | ----------------------------------------------------------------- |
| Market onboarding (excavation)   | ✅     | 3 screens: interest tags → 4 market cards → sources review        |
| Run Agent (signal fetch)         | ✅     | HN, PH, Indie Hackers, r/SaaS, r/Entrepreneur + custom subreddits |
| Manual signal logging            | ✅     | + Log Input form                                                  |
| Deep evaluate (streaming)        | ✅     | observe/skip/delete verdicts + synthesis block                    |
| Add observation manually         | ✅     | Hover card → Observe, or + Capture                                |
| Synthesize observations → thesis | ✅     | Requires ≥3 observations; cached per day                          |
| Validate thesis (proven market)  | ✅     | Agent auto-researches; editable; cached per thesis                |
| Lifestyle filter (agentic)       | ✅     | 5 filters; Q2 knockout; cached per thesis                         |
| Lifestyle filter (manual)        | ✅     | 5 checkboxes inline on validated thesis card                      |
| Ready to Build card              | ✅     | Shown when validated + lifestyle_pass = true                      |
| Multi-market switching           | ✅     | Header dropdown; each is a separate workspace                     |
| Stats (today / total / streak)   | ✅     | Scoped per market; shown in header                                |
| Digest button                    | ⏳     | Disabled — requires Resend/SMTP env vars for actual delivery      |
| Email signup                     | ✅     | Sends to /api/feedback; no confirmation email                     |
| Mobile bottom tab nav            | ✅     | Signals / Observe / Theses tabs                                   |

---

## Step 1 — Define your market

When you first open the app, you land on the onboarding screen.

**Screen 1 — What are you into?**

You will see a grid of 12 interest tags: freelance, dev tools, finance, e-commerce, fitness, real estate, creators, healthcare, legal, logistics, education, restaurants. Pick up to 3. Or skip the tags entirely and type a description in the field below the grid. You need at least one tag or some text to continue.

Click **Find my markets →**.

You will see a full-screen loading state: "Finding your markets — Cards appear in about 15 seconds." A progress bar animates while the agent generates four market segments, then verifies pricing and finds subreddits for each in the background.

**Screen 2 — Pick the one that fits.**

Four market cards appear. Each shows:

- The broad market category at the top
- A bold headline naming the person or group (e.g. "Independent Restaurant Owners", "Food Truck Operators")
- A description of their world — what they already pay for and why existing solutions frustrate them
- A price range (what people in this space already spend on tools)
- A demand badge: **proven demand**, **growing**, or **crowded**

These are market segments, not product ideas. You are choosing which group of people to research — the product idea comes later, from the signal feed.

Click the card that fits best. You can change it later.

If none fit: click **None of these feel right — let me refine ›** below the cards. A set of steer tags appears (more technical, more niche, different industry, I use this daily, show me boring markets, B2B focus, more underserved). Select any that apply, then click **Regenerate →**.

Once you click a card, you move to Screen 3.

**Screen 3 — Signal sources**

The app finds the best subreddits and product review pages (G2, Capterra) for your market. Sources stream in as they are discovered. Each one has a toggle — they are all enabled by default.

Review the list. Toggle off anything you do not want the agent pulling from.

Click **Start scanning →**. The app creates your market workspace, saves your source preferences, and starts fetching your first batch of signals in the background. You land in your market dashboard.

If discovery is taking too long, click **Skip source discovery →** at the bottom. The app will proceed with whatever sources arrived so far.

---

## Step 2 — Fill the left column with signals

You have two ways to do this.

### Option A — Run the agent (fastest)

Click **Agent ⌄** in the top-right of the left column. Click **Run Agent**.

A progress window opens. Wait 15–30 seconds.

What it does: it reads recent posts from Hacker News, Product Hunt, Indie Hackers, r/SaaS, r/Entrepreneur, and any custom subreddits you added to your market. It keeps only the ones that match today's question and your market focus. Everything else is thrown away.

When it finishes, click **→ Deep evaluate** to move straight to evaluation. Or close the window and click **Agent ⌄ → Evaluate** from the left column header.

### Option B — Add signals yourself

Click **+ Log Input** in the top-right of the left column.

Fill in the form:

- **What did you find?** One sentence.
- **Category** — Trends, Pain, Indie, or Raw.
- **Source** — where you found it (Hacker News, Reddit, etc.).
- **URL** — paste the link. Optional.
- **Notes** — one sentence on why it caught your attention. Write this now. You will forget later.

Click **Save**.

Aim for 5–12 signals per session.

---

## Step 3 — Evaluate the signals

Click **Agent ⌄** then **Evaluate** in the left column header. Or click **→ Deep evaluate** at the end of the Run Agent screen.

A window opens. Cards stream in one by one. Each card shows a verdict:

- **Observe** — real gap. Worth saving.
- **Skip** — interesting but not actionable.
- **Delete** — noise.

At the top of the window, there is an **Analysis** section with three lines:

- Which signals are strongest and why
- The pattern linking them
- A thesis the agent thinks the signals support

There is a big button below the analysis:

> **Accept top signals + form thesis**

Click it. This saves the top signals as observations and creates a thesis in the right column — all in one click. Done.

If you want to review cards one by one instead:

- Click **Accept** on any Observe card to save it as an observation.
- Click **Delete card** to remove noise.
- Ignore the Skip cards for now.

When you are done, click **Done**.

---

## Step 4 — Turn any single signal into an observation yourself

You do not have to use the agent. You can do this by hand.

Hover over any signal card in the left column. Click **Observe**.

The observation form opens pre-filled. Edit it:

- **Title** — describe the pattern, not the article. "Stripe fees are squeezing bootstrapped founders" not "Founder complains on Reddit."
- **Body** — one or two sentences. What is actually happening and why it matters.

Click **Save Observation**. It appears in the middle column.

---

## Step 5 — Turn your observations into a thesis

Once you have 3 or more observations saved, a **Synthesize** button appears in the top-right of the middle column.

Click it.

A window opens. It reads everything you have logged and looks for a pattern.

When it finishes, you will see:

- A proposed thesis — a one-sentence contrarian belief
- Which observations support it
- How confident it is (1 = hunch, 3 = believe it)
- A short explanation

If it looks right, click **Create thesis**. The thesis appears in the right column.

If it missed the mark, click the Re-run button in the bottom-right corner.

To write a thesis yourself, close this window and click **+ Form Thesis** in the top-right of the right column.

---

## Step 6 — Validate the thesis

This is the most important step. Most people skip it. Do not skip it.

Validation is evidence, not a feeling. You need one thing: proof that people already pay for something in this space.

Once you have any forming thesis, a **Validate →** button appears in the top-right of the right column.

Click it.

A window opens. The agent auto-picks the first thesis and starts researching. Use the **← / →** arrows to navigate between multiple forming theses.

### Proven Market

The agent searches for competing products and pre-fills this for you. Review it. Edit if needed.

You are looking for: 3–5 products that exist and charge money. If someone built it and charges for it, the market is real.

Examples of what to write:

> Vanta ($thousands/yr for compliance automation), Nightfall AI ($starts ~$1000/mo)

If the agent finds nothing, write what you know or leave it blank for now. Click **↺ Re-research** in the footer to try again.

### The button

When you are satisfied with the proven market field, click **Validate →**. This moves the thesis from **Forming** to **Validated**.

Results are cached per thesis. You can close and reopen the window without losing your research.

---

## Step 7 — Run the lifestyle filter

Validating the market is not enough. The question is whether this is a business you can run alone, without burning out.

Once you have validated theses, a **Lifestyle →** button appears in the top-right of the right column (on the Validated tab).

Click it.

The agent reads each validated thesis and scores it against five filters:

1. **Solo maintainable** — Can one person build and run this without a team?
2. **Recurring revenue day one** — Does the model generate recurring revenue from the start? _(This is a knockout. Fail it and the thesis does not pass.)_
3. **VC-ignored TAM** — Is the market too small for venture capital to care? Small enough that you can win.
4. **Reachable first 20** — Can you reach your first 20 customers directly without paid ads or a big audience?
5. **Boring enough for 5 years** — Can you maintain this without burning out?

The window shows ✓ or ✗ for each filter with a short explanation. Use **← / →** to navigate between theses.

If the thesis passes (4 of 5, and Q2 must pass), click **Accept →**. The thesis becomes a **Ready to Build** card.

If it does not pass, the result tells you which filters failed. You can re-run with **↺ Re-analyze** or use the manual checklist (hover the thesis card on the Validated tab).

---

## Step 8 — Link observations to theses manually

You do not have to use the automation. You can connect things by hand at any time.

**Attach an observation to a thesis:** hover over any observation card in the middle column. Click **Add to thesis**. A picker opens. Click the thesis you want to attach it to.

**Write a thesis yourself:** click **+ Form Thesis** in the right column header.

---

## Managing your markets

In the dashboard header, look for the orange market name displayed next to the date (e.g. `— Tuesday, March 31 · AI DEV TOOLS ⌄`). Click it to open a dropdown.

From the dropdown:

- Click any other market name to switch to it
- Click **Edit sources & name** to open market settings — rename the market, update the description, add or remove custom subreddits
- Click **All markets** to return to the market picker at `/`
- Click **+ New market** to start the onboarding flow for a new workspace

Each market is a separate workspace. Signals, observations, and theses in one market do not appear in another.

---

## Status

| Feature                          | Status | Notes                                                                                                                |
| -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Market onboarding (excavation)   | ✅     | 3 screens: interest tags → 4 market cards → sources review (discover-sources streaming)                              |
| Run Agent (signal fetch)         | ✅     | HN, PH, Indie Hackers, r/SaaS, r/Entrepreneur + custom subreddits                                                    |
| Manual signal logging            | ✅     | + Log Input form                                                                                                     |
| Deep evaluate (streaming)        | ✅     | observe/skip/delete verdicts + synthesis block                                                                       |
| Add observation manually         | ✅     | Hover card → Observe, or + Capture                                                                                   |
| Synthesize observations → thesis | ✅     | Requires ≥3 observations; cached per day                                                                             |
| Validate thesis (proven market)  | ✅     | Claude auto-researches; editable; cached per thesis                                                                  |
| Lifestyle filter (agentic)       | ✅     | 5 filters; Q2 knockout; cached per thesis                                                                            |
| Lifestyle filter (manual)        | ✅     | 5 checkboxes inline on validated thesis card                                                                         |
| Ready to Build card              | ✅     | Shown when validated + lifestyle_pass = true                                                                         |
| Multi-market switching           | ✅     | Header dropdown; each is a separate workspace                                                                        |
| Stats (today / total / streak)   | ✅     | Scoped per market; shown in header                                                                                   |
| Digest button                    | ⏳     | Button is disabled in the header; modal and API are wired but require Resend/SMTP env vars for actual email delivery |
| Email signup                     | ✅     | Sends to /api/feedback; no confirmation email                                                                        |
| Mobile bottom tab nav            | ✅     | Signals / Observe / Theses tabs                                                                                      |
