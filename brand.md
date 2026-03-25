# Brand

## Voice

How the product sounds in UI copy, headings, CTAs, and error messages.

- Short sentences. Direct. No setup. Every word earns its place.
- Confident without being arrogant. This tool knows what it is.
- Honest about what doesn’t exist yet. No fake polish on unfinished things.
- Never use: “powerful, seamless, revolutionary, unlock, supercharge, next-level, game-changing, robust”

---

## The User

A solo developer who knows how to build but doesn’t yet know what to build. They’re disciplined, impatient with noise, and optimizing for freedom over growth. They want a system that trains them to see — not another dashboard that dumps data on them.

---

## Visual Rules

- Color mode: Light and dark mode. Defaults to system preference. Toggle available in the dashboard header.
- Fonts: Space Grotesk (headlines) + Space Mono (badges, tags, code, timestamps). Currently implemented as Inter + JetBrains Mono — migration pending.
- Motion: Minimal. Subtle fade on load. Nothing that moves unless it has to.
- Avoid: No fake testimonials, no stock photos, no popups, no gradients, no decorative illustrations.

---

## Color System

**Dark mode** (default at night):

| Name       | Value                | Role                                       |
| ---------- | -------------------- | ------------------------------------------ |
| Accent     | oklch(0.75 0.18 142) | Primary — green signal color, CTAs, key UI |
| Secondary  | oklch(0.72 0.19 27)  | Orange-red — warnings, contrarian markers  |
| Background | oklch(0.10 0 0)      | Page background — near black               |
| Text       | oklch(0.92 0 0)      | Body text — near white                     |
| Muted      | oklch(0.65 0 0)      | Secondary text, borders, placeholders      |
| Border     | oklch(0.26 0 0)      | Dividers, input outlines                   |

**Light mode** (readable in bright daylight):

| Name       | Value                | Role                                         |
| ---------- | -------------------- | -------------------------------------------- |
| Accent     | oklch(0.52 0.18 142) | Primary — darker green for light bg contrast |
| Secondary  | oklch(0.55 0.22 27)  | Orange-red — warnings, contrarian markers    |
| Background | oklch(0.98 0 0)      | Page background — near white                 |
| Text       | oklch(0.12 0 0)      | Body text — near black                       |
| Muted      | oklch(0.42 0 0)      | Secondary text, placeholders                 |
| Border     | oklch(0.86 0 0)      | Dividers, input outlines                     |

Color rules:

- Competitors in this space (Exploding Topics, Treendly) own blue and purple territory. Avoid entirely.
- No gradients. No blue of any shade in brand chrome.
- Accent green is the single identity color — it anchors both modes.

---

## Logomark

**Direction:** Single letterform — the S in a sharp, monospace-adjacent style. Clean. No container.

**Primary color:** Accent — oklch(0.75 0.18 142)

**Background:** Transparent — no container, no badge, no circle

**Future-proofing:** Mark is abstract enough to work beyond the current use case.

**Competitor exclusions:** Avoid: blue tones, radar/pulse wave forms, globe icons, trending arrow marks

**Anti-patterns:** No upward arrows, no bar charts, no magnifying glasses, no waveforms, no radar pulses

---

## Emotional Arc

- Land: “This is exactly what I needed and didn’t know existed.”
- Read: “This person thinks the way I think.”
- Scroll: “I want to use this today.”
- Convert: “I’m building this into my daily routine.”

---

## Copy Examples

- Hero: “Train yourself to see what others miss.”
- CTA: “Start observing.”
- Daily prompt: “Where is something growing fast but being served poorly?”
- Weekly digest: “What you spotted. What it means. What you’d bet on.”
- Empty state: “Nothing here yet. Drop a signal.”
- Footer: “Built by Luke. For the 0.1% who consume signal, not noise.”
- Error: “Something went wrong. Refresh and try again.”
