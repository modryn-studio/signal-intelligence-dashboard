---
name: deploy
description: Pre-deploy checklist for a tool repo. Verifies basePath, runs build, then outputs the exact config for modryn-studio-v2.
agent: agent
---

This prompt runs from **the tool repo** (not modryn-studio-v2).

## Step 1: Verify basePath

Read `next.config.ts`. Check that `basePath` is set and does NOT still contain `TODO_SLUG`.

If it still says `TODO_SLUG`:
> Stop. Run `/setup` first, or manually set `basePath` to `/tools/your-slug` in `next.config.ts`. The slug must match the URL field in `context.md`.

If it's set correctly, extract the slug (the part after `/tools/`) and continue.

## Step 2: Run build

Run `npm run build`. Fix any errors before continuing. Do not proceed with a broken build.

## Step 3: Push to GitHub

Run:
```
git add -A
git commit -m "chore: pre-deploy build verification"
git push
```

If there are no uncommitted changes, skip the commit step and just confirm the branch is pushed.

## Step 4: Deploy to Vercel

You cannot automate Vercel deployment. Tell Luke:

> Push complete. Now:
> 1. Go to [vercel.com/new](https://vercel.com/new)
> 2. Import this GitHub repo
> 3. Leave all settings as default — do NOT set a custom domain
> 4. Click Deploy
> 5. When it finishes, copy the deployment URL (e.g. `https://your-tool.vercel.app`)
> 6. Come back and tell me: **"Vercel URL: https://your-tool.vercel.app"**

Wait for Luke to provide the Vercel URL.

## Step 5: Output studio-side config

Once you have the Vercel URL and the slug from Step 1, output this to Luke:

---

**Tool is on Vercel. Now wire it into modryn-studio-v2.**

Open modryn-studio-v2 in VS Code and run `/deploy`. Tell Copilot:

```
Tool slug: [slug]
Vercel URL: [vercel-url]
```