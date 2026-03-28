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
- Fonts: Inter (body, headlines) + JetBrains Mono (badges, tags, code, timestamps) + Playfair Display (daily question — serif italic in header).
- Motion: Minimal. Subtle fade on load. Nothing that moves unless it has to.
- Avoid: No fake testimonials, no stock photos, no popups, no gradients, no decorative illustrations.

**Layout:**

- Desktop: three-column grid — signal feed (left flank) / observations (center) / theses (right flank). Flanks sit on `--column-flank`, center on `--background`.
- Mobile: single-panel view with a bottom tab nav switching between Signals, Observe, and Theses. No horizontal scroll.

**Interaction patterns:**

- Action buttons (delete, observe, add-to-thesis) are revealed on card hover on desktop. On touch devices (`@media (hover: none)`) they are always visible — no hidden affordances on mobile.
- Active filter tabs: outlined style only — `border-foreground/60 text-foreground`. No filled background. Applies to all tab-style controls across the dashboard and modals.
- Inactive filter tabs (dark): `dark:bg-card border-border text-muted-foreground`.
- Card borders in dark: neutral `border-border` at rest, transitions to `border-primary` (orange) on hover for observation cards. Signal cards use `border-border/50`.
- Action button hover text: `hover:text-foreground/60`. Hover border: `hover:border-muted-foreground/60`. No bright orange on text-only hover states.

---

## Color System

All tokens are defined in `src/app/globals.css`. Light and dark mode are separate token sets. `@theme inline` bridges them to Tailwind utility classes.

**Light mode** — warm cream palette, burnt orange as primary action color:

| Token                | Value                 | Role                                        |
| -------------------- | --------------------- | ------------------------------------------- |
| `--background`       | oklch(0.985 0.008 80) | Header + center column — near-white warm    |
| `--card`             | oklch(0.94 0.013 80)  | Panel/card surface                          |
| `--foreground`       | oklch(0.18 0.02 55)   | Body text — warm near-black                 |
| `--primary`          | oklch(0.52 0.14 38)   | Burnt orange — CTAs, filled buttons         |
| `--muted-foreground` | oklch(0.45 0.02 60)   | Secondary text, timestamps, labels          |
| `--border`           | oklch(0.84 0.015 75)  | Dividers, input outlines                    |
| `--destructive`      | oklch(0.48 0.18 18)   | Errors, delete actions — redder than orange |
| `--success`          | oklch(0.48 0.14 145)  | Success states (same hue as signal-trends)  |

**Dark mode** — neutral graphite. Pure achromatic surfaces (zero chroma) so the burnt orange primary and signal category colors read with maximum punch. Never warm-tinted dark. Never pure black. Depth order: `--column-flank` (darkest) → `--background` → `--card` (lightest).

| Token                | Value                | Role                                               |
| -------------------- | -------------------- | -------------------------------------------------- |
| `--background`       | oklch(0.16 0 0)      | Header + center column — dark graphite             |
| `--card`             | oklch(0.21 0 0)      | Elevated card/panel surfaces                       |
| `--muted`            | oklch(0.24 0 0)      | Hover surfaces — slightly above card               |
| `--column-flank`     | oklch(0.12 0 0)      | Left + right columns — darkest layer, recessed     |
| `--foreground`       | oklch(0.95 0 0)      | Near-white body text — high contrast               |
| `--primary`          | oklch(0.62 0.14 38)  | Burnt orange — same hue as light, raised luminance |
| `--muted-foreground` | oklch(0.60 0 0)      | Timestamps, labels — neutral mid-gray              |
| `--border`           | oklch(0.26 0 0)      | Dividers, input outlines                           |
| `--secondary`        | oklch(0.25 0 0)      | Subtle elevated surface (inactive tabs, etc.)      |
| `--destructive`      | oklch(0.58 0.18 18)  | Errors and delete actions — lightened for dark bg  |
| `--success`          | oklch(0.58 0.14 145) | Same hue shift as primary — lightened              |

**Signal category colors** — used for category dots and badges. In dark mode, signal cards use a neutral border at rest that transitions to `--primary` on hover (no colored left border).

| Token                 | Light                | Dark                 | Category   |
| --------------------- | -------------------- | -------------------- | ---------- |
| `--signal-trends`     | oklch(0.48 0.14 145) | oklch(0.62 0.14 145) | Trends     |
| `--signal-complaints` | oklch(0.48 0.16 22)  | oklch(0.62 0.16 22)  | Complaints |
| `--signal-indie`      | oklch(0.50 0.16 264) | oklch(0.56 0.10 264) | Indie      |
| `--signal-data`       | oklch(0.52 0.12 55)  | oklch(0.65 0.12 55)  | Data       |

Chart tokens (`--chart-1` through `--chart-4`) reference signal tokens — single source of truth.

**Layout tokens:**

| Token            | Light                 | Dark            | Role                                       |
| ---------------- | --------------------- | --------------- | ------------------------------------------ |
| `--background`   | oklch(0.985 0.008 80) | oklch(0.16 0 0) | Header + center column (section 2)         |
| `--column-flank` | oklch(0.96 0.013 80)  | oklch(0.12 0 0) | Section 1 + section 3 — flanks are darkest |

Color rules:

- Burnt orange is the identity color in both modes. In light it's grounded and warm. In dark it pops against pure neutral — same hue (38), higher lightness.
- `--signal-complaints` hue (22) ≠ `--primary` hue (38). Complaints category dots must not look like action buttons.
- Competitors in this space (Exploding Topics, Treendly) own blue and purple. Avoid entirely in brand chrome.
- No gradients. No blue of any shade.
- `--muted` is a surface color distinct from `--card` — use it for hover states and inset zones. Always use `text-muted-foreground` for secondary text, not `text-muted`.
- Dark mode surfaces are zero chroma by design. The orange identity color provides all warmth. Do not reintroduce warm hues to surface tokens.

---

## Logomark

**Direction:** Single letterform — the S in a sharp, monospace-adjacent style. Clean. No container.

**Primary color:** Burnt orange in both modes — `oklch(0.52 0.14 38)` in light, `oklch(0.62 0.14 38)` in dark. Same hue, higher luminance in dark mode.

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
