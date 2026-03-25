---
name: seo
description: "Pre-launch SEO checklist: validate OG tags, register with search engines, submit sitemap."
agent: agent
---
# SEO Launch
Checklist

Walk me through the SEO launch steps for this project. First auto-generate any missing required files, then audit the full codebase, then guide me through the external steps I need to do manually.

## Step 0: Auto-Generate Missing Files
Before auditing, check for and CREATE the following files if they are absent:

**`src/app/sitemap.ts`** â€” if missing, create it. First check whether `@/config/site` exists â€” if it does, import `site.url`; otherwise hardcode the domain from `layout.tsx`:
```ts
import { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: site.url, lastModified: new Date('YYYY-MM-DD'), changeFrequency: "weekly", priority: 1 },
    // add remaining static routes from app/ directory
  ];
  return staticRoutes;
}
```
Use the actual current date for `lastModified` â€” do NOT use `new Date()` (which changes on every deploy and causes unnecessary crawl churn). Adapt as needed for any dynamic routes (log posts, tool pages, etc.).

**`src/app/robots.ts`** â€” if missing (do NOT create `public/robots.txt`), create it:
```ts
import { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
```

**Favicon files**  if `src/app/favicon.ico`, `src/app/icon.png`, or `src/app/apple-icon.png` are missing, tell the user to run `/assets`. Do not generate favicons manually  the asset pipeline handles transparency, grayscale detection, and all output paths correctly.

**`src/app/opengraph-image.tsx`**  if missing, create it. Use `site.ts` values for copy and colors, and load the logomark from `public/brand/logomark.png`. Always include: logo, headline from `site.ogTitle`, subtitle from `site.description`, and an amber CTA pill. This is the correct default structure:
```tsx
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '@/config/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), 'public/brand/logomark.png'), 'base64');
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div style={{ background: site.bg, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '80px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt={site.name} height={52} style={{ marginBottom: 32, objectFit: 'contain' }} />
        <h1 style={{ color: '#FAF7F2', fontSize: 64, fontWeight: 700, lineHeight: 1.1, margin: 0, marginBottom: 24 }}>
          {site.ogTitle}
        </h1>
        <p style={{ color: '#9E9693', fontSize: 28, margin: 0, marginBottom: 48 }}>
          {site.description}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', background: site.accent, color: site.bg, fontSize: 22, fontWeight: 700, padding: '14px 28px', borderRadius: 8 }}>
          {site.cta}
        </div>
      </div>
    ),
    { ...size }
  );
}
```
Also generate per-page `opengraph-image.tsx` for each route that has a `page.tsx` but no `opengraph-image.tsx` (scan `src/app/`  exclude root, `api/`, `privacy/`, `terms/`, and any `[param]` dynamic routes). For each, briefly read the `page.tsx` to understand the page's purpose, then use the same template structure with a page-appropriate headline and subtitle. The logo, brand colors, and CTA pill are identical across all pages.

**`src/config/site.ts`** â€” if missing, create it by reading the site name, URL, description, OG copy, and brand colors from `layout.tsx` and `copilot-instructions.md`:
```ts
// Single source of truth for all site-wide metadata.
export const site = {
  name: '<site name>',
  shortName: '<abbreviated name>',
  url: 'https://<domain>',
  description: '<meta description (110â€“160 chars)>',
  ogTitle: '<OG title (50â€“60 chars)>',
  ogDescription: '<OG description (110â€“160 chars)>',
  cta: '<CTA pill text (5--8 words, e.g. Get your plan for $9)>',
  founder: '<founder name>',
  accent: '<brand accent hex, e.g. #F97415>',
  bg: '<brand bg hex, e.g. #050505>',
  social: {
    twitter: 'https://x.com/<handle>',
    twitterHandle: '@<handle>',
    github: 'https://github.com/<org-or-user>',
  },
} as const;
```
Then update `layout.tsx` to import `site` and replace all hardcoded strings. Remove `manifest: '/manifest.json'` from the metadata export (Next.js auto-injects it from `manifest.ts`).

**`src/app/manifest.ts`** â€” if missing, create it (Next.js serves this at `/manifest.webmanifest` automatically â€” do NOT create `public/manifest.json`):
```ts
import { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.shortName,
    description: site.description,
    start_url: '/',
    display: 'standalone',
    background_color: site.bg,
    theme_color: site.accent,
    // Note: 'any maskable' combined is NOT a valid TypeScript type in Next.js 16+.
    // Declare 'any' and 'maskable' as separate entries.
    icons: [
      { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

**`src/components/site-schema.tsx`** â€” if missing, create it and add `<SiteSchema />` inside `<body>` in `layout.tsx`:
```tsx
import { site } from '@/config/site';

export function SiteSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([
          { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url, description: site.description },
          { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: site.url, logo: `${site.url}/icon.png`, description: site.description, founder: { '@type': 'Person', name: site.founder } },
        ]),
      }}
    />
  );
}
```

Report which files were created vs already existed.

**`twitter:site` in `layout.tsx`**  if `twitter.site` is missing from the Twitter card metadata, add it using `site.social?.twitterHandle`:
```ts
twitter: {
  card: 'summary_large_image',
  site: site.social?.twitterHandle,
  title: site.ogTitle,
  description: site.ogDescription,
},
```

**Sitemap `lastModified` dates**  if `sitemap.ts` uses `lastModified: new Date()` on any route, replace each with a static ISO date. `new Date()` reports a change on every crawl, wastes crawl budget, and degrades freshness signals. Use a date matching when that page last meaningfully changed.

## Step 1: Code Audit
Check the codebase for:
- [ ] `layout.tsx` has `metadataBase`, `title`, `description`, `openGraph`, `twitter`, `manifest`
- [ ] `layout.tsx` Twitter card has `site` handle (`twitter.site: site.social?.twitterHandle`)
- [ ] `src/app/favicon.ico` exists (multi-resolution, from logomark)
- [ ] `src/app/icon.png` exists (1024Ã—1024 logomark)
- [ ] `src/app/apple-icon.png` exists
- [ ] OG title is 50â€“60 chars, description is 110â€“160 chars
- [ ] `src/app/opengraph-image.tsx` exists (homepage OG image, dynamic via `next/og`) -- **required**; `public/og-image.png` alone does NOT inject the image into metadata
- [ ] Key pages beyond home (e.g. /result, /confirm) also have per-page `opengraph-image.tsx` -- if missing, auto-generate them (see Step 0 above)
- [ ] `src/config/site.ts` exists and is fully filled in (no TODO placeholder values)
- [ ] `src/app/manifest.ts` exists (do NOT check for `public/manifest.json`)
- [ ] `src/app/robots.ts` exists (do NOT check for `public/robots.txt`)
- [ ] `src/components/site-schema.tsx` exists and `<SiteSchema />` is rendered in `layout.tsx`
- [ ] `src/app/sitemap.ts` exists, lists all public routes, and uses static `lastModified` dates (not `new Date()`)
- [ ] `package.json` has a `description` field

Report PASS / MISSING for each item with file paths for anything missing.

## Step 2: Manual Launch Steps (guide me through these)

> **Stop here if not yet deployed.** Steps 2 and 3 require a live URL at `modrynstudio.com/tools/[slug]`. If you haven't run `/deploy` in modryn-studio-v2 yet, stop here. Complete Steps 0 and 1, commit, then run `/deploy`  then come back and pick up at Step 2.

ï»¿### Google Search Console
modrynstudio.com already has a verified **Domain property** in GSC. All tools deployed under that domain are covered automatically.

1. Go to the modrynstudio.com Domain property -> **Sitemaps**
2. Submit https://modrynstudio.com/tools/[slug]/sitemap.xml

**Optional - per-tool URL Prefix property:**
Add a **URL Prefix** property for https://modrynstudio.com/tools/[slug] for isolated search performance data per tool. Verification is automatic under the parent Domain property. Submit the tool sitemap to this property too.
### Bing Webmaster Tools
1. Go to https://www.bing.com/webmasters
2. Sign in with Microsoft account
3. Select **Import from Google Search Console** â€” pulls your site and sitemap automatically
4. Done (also covers Yahoo and DuckDuckGo which use Bing's index)

## Step 3: Validation
Tell me to check these once the site is deployed.

> **Use the direct Vercel URL for all validation tools** (e.g. https://yourapp.vercel.app/tools/yourtool), not the canonical modrynstudio.com URL. The root path /tools/yourtool on modrynstudio.com is served by modryn-studio-v2â€™s static page -- your Next.js app only serves sub-paths via rewrite. The Vercel URL always serves your actual app.

- **OG preview:** https://opengraph.xyz -- paste **direct Vercel URL**, verify title 50â€“60 chars, description 110â€“160 chars, image 1200Ã—630
- **JSON-LD:** https://search.google.com/test/rich-results -- paste **direct Vercel URL**, should show â€œ1 valid item detectedâ€
- **DNS propagation:** https://www.whatsmydns.net -- check TXT record has propagated







