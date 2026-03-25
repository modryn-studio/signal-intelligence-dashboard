---
name: polish
description: 'UI consistency sweep: audits all components, ensures shared primitives exist, migrates raw elements, fixes responsive gaps, keyboard safety, and touch targets — then verifies with lint + tsc.'
agent: agent
---

You are running a full UI consistency pass on this Next.js project. Work through every phase in order. Do not summarize or stop early — complete all phases.

---

## Phase 1: Verify Primitives Exist

Check that `src/components/ui/button.tsx`, `input.tsx`, and `textarea.tsx` all exist.

If any are missing: **stop here. Do not create them from a template.** Pull the canonical versions from `https://github.com/modryn-studio/nextjs_boilerplate/tree/main/src/components/ui/` and find out why the file was deleted before proceeding.

---

## Phase 2: Audit Components

Read every file in `src/components/` and every `page.tsx` / `page-content.tsx` under `src/app/`.

For each file, check ALL of the following:

### Interactive Elements

- [ ] Raw `<button>` elements that should use `<Button>` from `@/components/ui/button`
      **Exception:** buttons with intentionally non-standard shapes (circular icon-only, custom media controls) — leave these raw, add a `{/* custom shape — intentionally raw <button> */}` comment
- [ ] Raw `<input type="text|email|tel|search|url|password">` that should use `<Input>` from `@/components/ui/input`
- [ ] Raw `<textarea>` that should use `<Textarea>` from `@/components/ui/textarea`

### Brand Token Usage

- [ ] Any `[var(--color-*)]` arbitrary values — replace with `(--color-*)` shorthand or named utility (`bg-accent`, `border-border`, etc.)
- [ ] Any hardcoded hex values that should reference a brand token
- [ ] Any pre-shadcn token names that survived a migration: `bg-surface` → `bg-card`, `text-text` → `text-foreground`, `text-muted` (as a text color, not `text-muted-foreground`) → `text-muted-foreground`, `placeholder:text-muted` → `placeholder:text-muted-foreground`, `hover:text-text` → `hover:text-foreground`

### Responsive Spacing

- [ ] Any `px-6` or `px-8` on page/section wrappers that should be `px-4 sm:px-6`
- [ ] Any vertical padding without a smaller mobile breakpoint variant
- [ ] Any dense body copy blocks using `text-base` alone, missing a `text-[15px] sm:text-base` density step

### Mobile Keyboard Safety

- [ ] Any `fixed` or `sticky` bottom container that includes a text input — check for `visualViewport` keyboard offset tracking. If missing: HIGH priority fix.

### Touch Targets

- [ ] Any interactive element with height < 44px — look for `py-1`, `py-1.5`, `h-8`, `h-9` on buttons/links in mobile-visible UI

---

## Phase 3: Fix

Apply all changes found in Phase 2. For each file edited:

1. Add necessary imports (`import { Button } from '@/components/ui/button'` etc.)
2. Replace raw elements with primitives, preserving any per-element className overrides
3. Fix `[var(--color-*)]` → named utilities
4. Fix responsive spacing
5. Add `visualViewport` keyboard offset tracking where needed (use the pattern from `.github/instructions/design-system.instructions.md`)
6. Increase touch targets where too small

For anything ambiguous (complex custom shapes, intentional design choices), leave a `// TODO: CHECK — [reason]` comment instead of guessing.

---

## Phase 4: Verify

Run:

```
npm run lint
```

Then:

```
npx tsc --noEmit
```

If errors remain from your changes, fix them before proceeding.

---

## Phase 5: Report

Output this exact format:

```
## Polish Report

### Migrations Applied
- [component] — [what changed]

### Responsive Fixes
- [component] — [what changed]

### Keyboard Safety Fixes
- [component] — [what was added]

### Touch Target Fixes
- [component] — [what changed]

### Left for Manual Review
- [anything flagged with TODO: CHECK]

### TypeCheck: PASS / FAIL
### Lint: PASS / FAIL
```

Do not commit. Luke reviews the diff and commits manually.
