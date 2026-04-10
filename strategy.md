# Monetization & Distribution Strategy

Validated March 2, 2026. This is the operating playbook for every tool shipped from Modryn Studio.

---

## Discovery Methodology

**The target:** a space that is growing fast, served poorly, and already has proven demand. All three. Not two.

**The loop — how you find and confirm it:**

```
Input            → a signal worth tracking. A trend, a Reddit thread, a briefing
                   item, a complaint pattern. Raw material.
Observation      → what the signal actually means. Not what happened — why it matters.
Contrarian Truth → the angle the market has gotten wrong. Name it precisely.
                   If you can't, don't build.
Proven Market    → someone is already paying for something in this space.
                   Name two or three products. If you can't, it's a market
                   creation bet — a different game entirely.
```

**The mapping:**

- Growing fast → Input + Observation confirm momentum
- Served poorly → Contrarian Truth (incumbents missed something)
- Proven demand → Proven Market (people are already paying in this space)

---

## Monetization — Ranked by Fit

### Tier 1: Email Capture (every tool, no exceptions)

Email is the meta-asset. Tools may live 1–3 months. The email list carries value across all of them.

Every tool must have a reason to give you an email: notify me when X, save results, weekly digest. This is not optional — it's the compounding mechanism across the entire product studio.

The shared Resend list is segmented per tool. One list, many segments, one broadcast when needed.

### Tier 2: Recurring Subscription (target state) / One-Time Payment (launch shortcut)

**The goal is recurring.** Stable monthly revenue — even $29–$99/mo from a small audience — is what creates a calm business. One-time payments require constant acquisition to maintain income. Recurring lets the product work while you sleep.

**Use one-time as the launch shortcut, not the destination.** No subscription overhead, no auth, no user accounts — it's the fastest path to a first dollar. But when the product has proven retention (people coming back), convert to a recurring model.

- One-time $9 sweet spot — enough to filter freeloaders, low enough for impulse buy. Use this to validate demand.
- Subscription target: $19–$49/mo for tools with recurring use cases. Wire this once retention is confirmed.
- Pattern: free tier works → user hits a limit → PayGate → localStorage receipt
- Stripe handles the payment UI. Never build a custom checkout in a 48-hour window.

**Two paths, same PayGate component:**

|             | Payment Links (default)         | Checkout Sessions (upgrade)                    |
| ----------- | ------------------------------- | ---------------------------------------------- |
| Code needed | Zero                            | API route + `stripe` npm                       |
| Env vars    | None                            | `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`         |
| Setup       | Create link in Stripe Dashboard | Install SDK, configure route                   |
| Best for    | One price, one product          | Dynamic pricing, coupons, programmatic control |

Start with Payment Links. Upgrade to Checkout Sessions only when you need features Payment Links can't do.

**Stripe operational notes:**

- Disable Cash App Pay in Dashboard → Settings → Payment methods (90%+ of disputes come from it)
- Test mode: use test keys + card 4242 4242 4242 4242 during dev, switch to live keys at deploy
- Webhooks are NOT needed for localStorage receipt flow — add only when server-side verification is required (see issue #13)
- Merchant of Record (Paddle/Lemon Squeezy) is not needed at current scale — evaluate when international tax compliance becomes a burden (see issue #14)

Decision: set this in `context.md` before writing code. If the tool saves someone 30+ minutes of manual work, charge for it. If it's purely informational, email-only.

### Tier 3: Affiliate Links (week 2+ only)

Only when there's a natural product-adjacent next step the user already wants to take. Examples: hiking tool → AllTrails Pro, travel tool → booking.com, stock tool → broker referral.

Don't wire this during the 48-hour build. Evaluate after launch if the tool sticks and the product fit is obvious.

### Tier 4: Display Ads (50k+ monthly organic only)

Not worth the CLS penalty and code bloat below 50k monthly visitors. At 10k visits/month you're earning $50–150. Use mediation (not a single network) when you do add them.

Tracked in GitHub issue — evaluate when any single tool crosses 50k/month consistently.

---

## Distribution — Ranked by Impact

### 1. Reddit (primary channel)

Post in the subreddit where the pain lives, not the founder subreddit. Target subreddits should be identified during the discovery phase and stored in `context.md`.

Rules:

- Lead with the problem, not the product
- Post as a person who built something, not a marketer
- Engage comments for 24–48 hours — engagement = algorithm love
- Never buy upvotes. Bans are permanent.
- r/SideProject is the founder channel — useful but secondary

Store target subreddits in the tool JSON `subreddits` field so `/social` generates tailored copy per community.

### 2. Programmatic SEO (highest ceiling, slowest start)

Pattern: head term + modifiers (city, experience level, variant) = hundreds of unique pages.

Timeline reality check:

- Indexing: 4–8 weeks on a new subdirectory
- Meaningful traffic: 3–6 months
- This is the month-3+ compounding play, not day-1 revenue

Critical: each page needs genuine data differentiation. Swapping city names in a template will poison the domain. Use real API data per page.

Wire the page template during the 48-hour build if applicable. Don't count on organic traffic before month 3.

### 3. Building in Public on X

Post weekly — the build story, a milestone, a decision worth sharing:

- Document what you built, why, and what surprised you
- Always attach a screenshot or GIF of the tool in action

### 4. Indie Hackers (week 2)

Post-launch retrospective. The build story — what you spotted, what you built, and how fast — is as interesting as the tool itself.

### Skip: Product Hunt

Not worth the coordination overhead for fast-turn tools. Your launch window is 48 hours; PH needs a week minimum.

---

## Per-Tool Launch Playbook

```
Day 0 (build):     Wire email capture + one monetization method
Day 1 (launch):    Reddit post in the pain subreddit(s)
                   X post with demo GIF
                   Submit to google search console
Day 2–3:           Engage Reddit comments aggressively
                   Start pSEO pages if applicable
Week 2:            Indie Hackers post — the build story
                   Evaluate affiliate fit
Month 1+:          pSEO compounds, email list grows
```

---

## Domain Strategy

All future tools deploy under `modrynstudio.com` as subdirectory paths — not subdomains. Subdirectories inherit domain authority. Subdomains are treated as separate sites by Google.

- ✅ `modrynstudio.com/tools/hiking-finder` — inherits authority
- ❌ `hiking-finder.modrynstudio.com` — treated as a new domain, no authority inheritance

**Chosen approach: separate repo + Vercel rewrites**

Each tool is its own repo (from the boilerplate). It deploys to a free `.vercel.app` URL. `next.config.ts` in modryn-studio-v2 rewrites `modrynstudio.com/tools/[slug]/*` → the tool's Vercel URL. Google sees one domain and one authority footprint. The tool repo never needs a custom domain.

---

## API Potential

If this tool gets strong traction, could the signal intelligence pipeline be exposed as an API? Developers and teams may want programmatic access to the same signals rather than using the dashboard UI. Worth exploring if retention and usage metrics are strong.

Setup per tool:

1. Tool repo: set `basePath: '/tools/[slug]'` in its `next.config.ts`
2. Tool repo: deploy to Vercel — note the `.vercel.app` deployment URL
3. modryn-studio-v2: add one rewrite entry in `next.config.ts` pointing that path to the deployment URL
4. modryn-studio-v2: add the tool JSON to `/content/tools/[slug].json` for the landing page

See `next.config.ts` in modryn-studio-v2 — three tools are already wired up as reference.

**Other rules:**

- `/tools/[slug]` in modryn-studio-v2 is always the landing page (SEO magnet, email capture)
- One email list, one analytics dashboard, one SEO footprint
- SpecifyThat stays on `specifythat.com` — it predates the studio. Nothing new gets its own domain unless it earns a standalone brand later.
