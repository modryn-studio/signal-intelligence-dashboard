---
name: validate
description: "Validates context.md and brand.md against live market data, competitor landscape, and SEO opportunity — produces validation reports with web search"
agent: agent
---

Read `context.md`, `brand.md`, and `strategy.md` from the workspace root. Then run TWO validation passes using web search for every claim.

---

## Pass 1: Context Validation

Web search to validate every major claim in context.md:

### Competitor Landscape
- Search for existing tools solving the same problem
- For each competitor found: name, URL, pricing, what they do well, what they miss
- Rate the competition gap: GREEN (wide open), YELLOW (opportunity exists), RED (saturated)

### User Pain Validation
- Search Reddit, forums, and social media for posts describing the exact pain this tool addresses
- Quote 3–5 real posts (with links if possible)
- Rate pain signal strength: STRONG (frequent, emotional posts), MODERATE (occasional mentions), WEAK (have to stretch to find it)

### SEO Opportunity
- Search for the primary keywords the target user would type
- Note what currently ranks — are results poor quality? Are there content gaps?
- Check if pSEO is viable (head term + modifiers pattern)
- Rate SEO opportunity: HIGH (poor existing content, clear keyword gap), MEDIUM (some competition but room), LOW (dominated by established players)

### Monetization Check
- Based on competitor pricing and the value delivered, does the chosen monetization tier make sense?
- If `one-time-payment`: is the $9 price point justified? Would users pay more? Less?
- If `email-only`: is there a missed monetization opportunity?

### Route Map Sanity
- Do the planned routes cover the core user flow?
- Is anything missing (common patterns for this type of tool)?
- Is anything unnecessary (scope creep for a 48-hour build)?

---

## Pass 2: Brand Validation

Web search to validate brand positioning:

### Voice Check
- Does the voice match the target user's expectations?
- Search for how competitors communicate — is this differentiated enough?
- Flag any voice rules that conflict with the target audience

### Visual Positioning
- Search for competitor visual styles — does the chosen palette stand out?
- Is the accent color already strongly associated with a competitor?

### Copy Effectiveness
- Are the hero/CTA/footer examples compelling for the specific target user?
- Do they pass the "so what?" test — would someone stop scrolling?
- Compare to what's working in the space

---

## Output

Present findings as a structured report:

```
## Context Validation Report

### Competition: GREEN / YELLOW / RED
[findings + competitor table]

### Pain Signal: STRONG / MODERATE / WEAK
[findings + quoted posts]

### SEO Opportunity: HIGH / MEDIUM / LOW
[findings + keyword analysis]

### Monetization: CONFIRMED / RECONSIDER
[findings + reasoning]

### Route Map: COMPLETE / GAPS FOUND
[findings + suggestions]

---

## Brand Validation Report

### Voice: ALIGNED / ADJUST
[findings]

### Visual: DIFFERENTIATED / RISK
[findings]

### Copy: EFFECTIVE / NEEDS WORK
[findings + specific suggestions]

---

## Recommended Changes
[Specific edits to context.md and/or brand.md, if any. If none needed, say so.]
```

Do not edit context.md or brand.md directly. Present findings and let Luke decide what to change.

---

## Focused Validation (Optional)

If Luke specifies a focus area (e.g. "validate the pricing" or "validate the route map"), run only the relevant section — skip the rest. This is used for per-phase validation during active development.
