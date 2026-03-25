---
name: launch
description: "Distribution checklist: sharing hooks, social footer, share-on-X hooks, and community posting guide."
agent: agent
---
# Launch Distribution

Walk me through the distribution launch for this project. First fix what the codebase is missing, then audit what's in place, then guide me through where to post on launch day.

Run this after `/seo` (which handles technical SEO). This covers getting eyes on the product — sharing hooks, social presence, and community posting.

## Step 0: Auto-Fix Codebase

Check and implement the following if missing:

> **Runs after `/seo`**  OG images (homepage + per-page), `twitter:site` handle, sitemap dates, `robots.ts`, `manifest.ts`, and `site-schema.tsx` are all handled by `/seo`. Do not re-do them here.

**`site.ts` social block** — if `site.social` is missing or contains TODO values, populate it from the Social Profiles section of `context.md`:
```ts
social: {
  twitter: 'https://x.com/<handle>',
  twitterHandle: '@<handle>',
  github: 'https://github.com/<org-or-user>',
  // devto, shipordie, etc. if listed in context.md
},
```
If `context.md` has no social profiles filled in, ask the user for their X/Twitter handle before proceeding.

**Footer social links** — check whether the site footer includes links to the social profiles in `site.social`. If not, add `<a>` tags for X/Twitter and GitHub at minimum. Use `site.social.*` as the source — never hardcode URLs. Example:
```tsx
<a href={site.social.twitter} target="_blank" rel="noopener noreferrer">X</a>
<a href={site.social.github} target="_blank" rel="noopener noreferrer">GitHub</a>
```

**Modryn Studio footer credit** — check whether the footer copyright includes a link to `modrynstudio.com`. If not, update it:
```tsx
© {new Date().getFullYear()} {site.name} · <a href="https://modrynstudio.com" target="_blank" rel="noopener noreferrer">Modryn Studio</a>
```

**Sharing hook at outcome** — check the success / done state of the main user flow (the screen shown after the core action completes). If there is no share button or link, add a pre-filled X/Twitter share link:
```tsx
// Pre-filled tweet — edit text to match brand voice from copilot-instructions.md
const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent('Your message here — keep under 200 chars')}&url=${encodeURIComponent(site.url)}`;

<a href={shareUrl} target="_blank" rel="noopener noreferrer">
  Share on X
</a>
```
The message should come from the brand voice in `copilot-instructions.md` and reference what the user just accomplished. Ask the user to approve the copy before implementing.

**FAQPage schema** — on any long-form educational page (`/how-it-works`, `/about`, `/faq`) that answers questions in H2/H3 sections, check for a `FAQPage` JSON-LD schema. If absent, generate one from the page headings and content:
```tsx
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'H2/H3 heading as question',
      acceptedAnswer: { '@type': 'Answer', text: 'Section content as plain text' },
    },
    // repeat for each H2/H3 section
  ],
};

// In the page component:
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
```


Report what was created vs already existed.

## Step 1: Audit
- [ ] `site.ts` has `social` block with real values (no TODOs)
- [ ] Footer has X/Twitter + GitHub links from `site.social`
- [ ] Footer has Modryn Studio credit linking to modrynstudio.com
- [ ] Main flow success/done state has a share link
- [ ] Educational/FAQ pages have FAQPage JSON-LD
- [ ] Product screenshots referenced in `site.ts` or content JSON are rendered in the landing page (not just stored in `public/`)

Report PASS / WARN / MISSING for each.

## Step 2: Launch Distribution Playbook

### Day 0 — Prep (before going live)
1. **Launch log post**  Run `/log` from this repo. This is the launch post  distinct from any build logs posted during Phase 2. Opens a PR against modryn-studio-v2. Merge before posting anywhere so links don't 404.
2. **Flip tool to live**  Run `/tool` from this repo with `status: "live"`. This is always required at launch even if you ran `/tool` earlier with `status: "building"`. Opens a PR against modryn-studio-v2. Merge alongside the log PR.
3. **Social copy** — After both PRs are merged, switch to modryn-studio-v2 and run `/social` with the merged log post. That repo has the voice rules — `/social` must run there, not here.
4. **Queue content** — Draft your Reddit posts (one per target subreddit from this project's tool JSON `subreddits` field). Don't post yet.

### Day 1 — Launch
Post in this order, 30–60 min apart:
1. **Reddit niche subreddits** — Post to each subreddit listed in the tool's `subreddits` field. Lead with the user's problem, not the product. "I was frustrated by X, so I built Y." Link to the tool, not the studio.
2. **Reddit r/SideProject** — Founder channel. Here you can talk about the build process. Link to the log post.
3. **X/Twitter** — Post with screenshot/GIF attached. Tag relevant accounts if applicable.
4. **Ship or Die** — Post build update.

### Day 2 — Follow-up
1. **Reply to every Reddit comment** — This drives the algorithm. Genuine replies, not "thanks for the feedback!" spam.
2. **Dev.to** — Cross-post from RSS feed (auto-drafted, publish manually). Add a canonical URL back to your log post.
3. **Indie Hackers** — Brief show-and-tell post in the Products section.

### Week 1 — Compound
1. **Monitor Vercel Analytics** — Check which channels drove actual signups/usage, not just pageviews. Dashboard: Vercel → project → Analytics tab.
2. **pSEO seed** — If the product has comparison or "best X for Y" potential, create 1–2 programmatic pages. These take 2–4 months to rank but compound. Don't skip this step.
3. **Hacker News** — Only if you have a genuine technical insight to share (not a product plug). "Show HN" with a paragraph about the interesting technical decision, link to the tool.

> **Requires a live URL.** Run `/deploy` in modryn-studio-v2 first if you haven't already.

## Step 3: Validation
Check these are live before posting anywhere:
- **OG preview:** https://opengraph.xyz — paste the live URL, image loads correctly, title/desc match
- **Share link test:** open your pre-filled X share URL in a browser — confirm it pre-fills correctly
- **FAQPage schema:** https://search.google.com/test/rich-results — should show FAQ rich result if implemented
