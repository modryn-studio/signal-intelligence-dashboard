---
name: deps
description: "Validate all dependencies - versions AND API patterns - against live documentation. Surfaces breaking changes, not just version gaps."
agent: agent
tools: ['runInTerminal', 'editFiles', 'fetch']
---

# Validate Dependencies

My training data has a cutoff. Even if I know a package, I may be writing against an old API. This command fixes both problems: version gaps AND stale patterns.

---

## Step 1: Inventory

Read `package.json` (installed) and `context.md` Stack Additions section (planned but not yet installed). Build a combined list of every meaningful package in this project, installed and planned.

---

## Step 2: Version check

Run `npx npm-check-updates --format json` in the terminal. Capture the output. Do not install anything yet.

---

## Step 3: Web search - API patterns for every key package

For each package below (if it appears in the inventory), fetch its changelog or migration guide and extract:
- Current stable version as of today
- Any breaking API changes since the installed version
- Current recommended setup/config pattern
- Any deprecations or "old way vs. new way" notes

Packages to always validate if present:

| Package | What to search |
|---|---|
| `next` | "Next.js changelog" or site:nextjs.org/docs/app - App Router, metadata API, route handlers, next/font |
| `tailwindcss` | "Tailwind CSS v4 upgrade guide" - @theme block, config file removal, utility changes |
| `react` / `react-dom` | "React 19 migration guide" - hooks changes, Server Components, use() |
| `stripe` | "Stripe Node.js changelog" + "Stripe Checkout Session" - session creation API, metadata limits, webhook verification |
| `resend` | "Resend Node.js SDK changelog" - send API, audience/contacts API |
| `openai` | "OpenAI Node.js SDK v4 migration" - chat completions API, structured output, streaming |
| `@anthropic-ai/sdk` | "Anthropic SDK changelog" - messages API, model names |
| Perplexity | "Perplexity API documentation" - current endpoint, auth, response format |
| Telnyx | "Telnyx Node.js SDK" + "Telnyx messaging API" - SMS send, webhook format |
| `lucide-react` | "lucide-react changelog" - icon name changes (these break silently) |

For any package NOT in the table, check npm for current version only. No deep search needed for utility packages like `clsx`, `tailwind-merge`.

---

## Step 4: Report

Output two tables.

**Table A - Version status:**

| Package | Installed | Latest | Gap | Breaking? |
|---|---|---|---|---|
| next | 16.1.6 | ... | ... | yes/no |
| ... | | | | |

**Table B - API changes to know about:**

For each package where the web search found a meaningful change since the installed version (or since my likely training cutoff), write one line:

  **[package]** - [what changed and what the current pattern is]

Example:
  **tailwindcss** - v4 removed tailwind.config.ts. Tokens now declared in CSS via @theme {}. Utility class names for custom tokens auto-generated.

If nothing changed that affects usage, write:
  **[package]** - API stable. No usage changes required.

---

## Step 5: Ask before touching anything

After both tables, ask:
"Which packages do you want to update? I will update package.json and run npm install. I will also flag any code changes required before running npm run build."

Wait for a response before making any file changes.

---

## Step 6: Apply updates (only after approval)

For each approved update:
1. Run `npx npm-check-updates -u [package-name]` or edit `package.json` directly
2. Run `npm install`
3. If Table B flagged a code change for that package, apply it now and explain what changed
4. Run `npm run build` to confirm nothing broke

---

## Rules

- Never auto-update major versions - always ask first
- Never guess at an API - if the web search result is ambiguous, say so and link the source
- Patch/minor updates can be batched together if approved
- Do not pin versions (leave ^) unless explicitly asked
- If a planned package from context.md has no npm entry or the model name does not exist (e.g. an AI model name that may have changed), flag it explicitly

---

## Known Holds

Packages that are intentionally held back. Do not recommend upgrading these without first checking the blocker is resolved.

| Package | Held at | Reason | Unblock condition |
|---|---|---|---|
| `eslint` | 9.x | `eslint-config-next` bundles `eslint-plugin-react`, which calls the removed `context.getFilename()` API. ESLint 10 fails immediately with "context.getFilename is not a function". | Wait for `eslint-config-next` to ship an ESLint 10-compatible version. |
