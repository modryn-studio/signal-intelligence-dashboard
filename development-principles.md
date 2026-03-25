# Development Principles

## Core Philosophy

- **Focus and solve your own problems** - You are user zero. Build for yourself first.
- **Be unique and original** - In the AI era, differentiation is your only moat.
- **Break the rules** - Convention is the enemy of breakthrough products.
- **Success is a mix of skill, timing, & luck** - Ship fast to maximize timing windows and create more at-bats for luck.

## Market Strategy

- **Start with a micro niche** - Target 100 obsessed users, not 10,000 casual ones.
- **Plan micro-to-multi-niche expansion** - Dominate one niche completely before expanding to adjacent markets.
- **Share your ideas freely** - Execution beats secrecy. Open sharing builds community and accelerates feedback loops.

## Building Approach

- **Start small. Don't think big.** - Ship one killer feature, not ten mediocre ones. Launch in days, not weeks.
- **Your enemy is perfection, BUT the first prototype must function really well** - Ugly is acceptable. Broken is not. Polish the core action ruthlessly.
- **Old World (Human Developer) = months to MVP. New World (AI-Assisted) = days to MVP** - Use time saved for user research and distribution, not more features. Speed is table stakes now — everyone ships fast. The edge is what you do with the time you save.
- **Email = curiosity. Pre-order = validation.** If there's a paid tier planned, put a founding member price on the landing page before committing to the full build. Even $4.99 proves someone will exchange money, not just attention. The first payment is the real signal — not the waitlist signup. Worst case: zero buyers, and you learned something before writing a line of core product code.
- **Call your early buyers before you build deep.** Pre-orders prove clicks, not retention. Get on a call with every person who paid or seriously expressed intent. Ask: what's their current system, what have they tried, what made them act? The real product core surfaces here — not from what you assumed you'd build.

## AI-First Development

Leverage these tools in every project:

1. **Machine Learning** - Personalization from day one
2. **Agent Workflows** - Automate user tasks end-to-end
3. **Agent-to-Agent Workflows** - Build autonomous multi-agent systems
4. **SDKs** - Let users extend your product
5. **Newest AI Tools** - Stay on the bleeding edge, rebuild when better tools emerge

## Landing Page vs. Feature — Sequencing

**Default: build the feature first.** The basic landing page from setup is enough for warm-traffic acquisition (log readers, social followers). Don't touch it. Build the killer feature and use real product output as the landing page upgrade after the loop runs.

**Exception: if you already have demonstrable output, put it on the page first.** Existing examples, manual results, or recordings of the thing working are proof — not polish. They go on the page before you build the ordering/delivery flow, because they're the conversion mechanism.

**The decision test:**

> Do I have real output I can demonstrate right now?
>
> - No → build the feature. Upgrade the page after the loop runs.
> - Yes → prove it on the page. Then build the delivery flow.

Your acquisition channel determines how much landing page you need at launch. Warm channel (your log/social audience) → basic page is fine. Cold channel (organic search, paid, cold Reddit) → proof must be on the page before traffic arrives.

## UI Tooling

Feature-first, always. Don't reach for UI tools until the core feature works end-to-end.
Ugly is acceptable. Broken is not. Polish the core action after it functions.

**Role split:**

| Tool             | Job                                                                                                 | When to use                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Copilot (VSCode) | Feature logic, state, API wiring, anything needing codebase context                                 | All the time                                                           |
| v0.dev           | Visual UI component generation — outputs Next.js + Tailwind natively, GitHub sync to branch         | Once the feature works and you need a specific component to look right |
| 21st.dev         | Browse before building agentic/pipeline UI — streaming indicators, status cards, checkpoint layouts | Before building pipeline screens from scratch                          |
| Stitch (Google)  | Design exploration / visual direction — post-prototype only                                         | Once you have something working to react against                       |

**Rules:**

- Don't reach for v0/Stitch until the feature works against real data
- Use v0 surgically: one problem, one component, import it, wire it in VSCode
- Time saved by AI dev speed → distribution, not UI polish. Post the launch log first.
- v0 imports are zero-friction — same stack. Stitch output format varies — may need translation.

## Distribution

- **Distribution is the moat, not dev speed.** See `strategy.md` for the full operational playbook — Reddit, pSEO, X, launch timeline, and domain strategy.
- **Build log is distribution** - Every `/log` post is content that can be cross-posted to dev.to, shared on Reddit, and linked from X. The build log IS the content marketing strategy.
- **Show, don't just tell in log posts** - Every post that ships a visible feature must include a screenshot or screen recording (GIF). Drop the file in `public/log/[slug]-demo.gif` and reference it with `![demo](/log/slug-demo.gif)`. Cover images go in `public/log/covers/` — generate them with `node scripts/gen-cover.mjs --slug <slug>`. Callout boxes use `<div class="callout">key insight</div>`. Diagrams use fenced ` ```mermaid ``` ` blocks.

## User Experience

- **Onboard to value in <2 minutes** - Every second to the "aha moment" matters. Remove all friction.
- **Create emotional connection** - Success metric: "They miss it when it's gone."
- **Gamify strategically** - Use competition, streaks, and points to drive early engagement. Transition to intrinsic motivation as users go deep, giving them "this is special and different" feeling.
- **People love competition** - Build competitive elements into core mechanics.

## Data & Evolution

- **Data Flywheel Hack** - Every user interaction trains your AI. Your product gets smarter daily without manual effort. This compounds exponentially.
- **Data collection for app evolution** - Instrument everything from day one. Build analytics before features.
- **Truth in data and numbers** - Watch what users DO, not just what they SAY. Combine qualitative interviews with quantitative metrics.
- **Lots of experimentation** - A/B test aggressively. Kill what doesn't work. Double down on what does.
- **Look for user feedback** - But filter for power users. Loud ≠ right.
