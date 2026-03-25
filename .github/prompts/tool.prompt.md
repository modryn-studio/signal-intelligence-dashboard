---
name: tool
description: "Register or update a tool on modrynstudio.com via PR."
agent: agent
---

You are in a project repo that is not `modryn-studio/modryn-studio-v2`. Register or update a tool entry on modrynstudio.com by opening a PR on that repo.

Ask for the following if not already provided:

1. **Name** — display name of the tool
2. **Tagline** — one sentence, outcome-focused. What the user gets, not what the tech does. Displayed in amber on the tool page below the title. Example: "Context files for your AI coding tool"
3. **Description** — one to two sentences. More detail about who it's for and what problem it solves. Used in metadata and the tool card.
4. **Bullets** — (optional) 3–5 short bullets showing the key features or steps. Displayed as a list on the tool page. Example: `["Describe your idea in plain English", "Answer 13 questions", "Download in 60 seconds"]`
5. **Status** — one of: `live`, `beta`, `building`, `coming-soon`
6. **URL** — (optional) external URL if the tool lives at a separate domain
7. **Screenshots** — Check if `public/screenshots/<slug>-light.png` and `public/screenshots/<slug>-dark.png` exist in the current repo (use the slug derived in the step below).
   - If both exist: use them. Commit any uncommitted screenshots before opening the PR.
   - If only one exists: use it for `screenshotUrl` only.
   - If neither exists: ask the user to drop screenshots into `public/screenshots/`. Preferred: `<slug>-light.png` + `<slug>-dark.png`. A single `<slug>.gif` is also accepted for an animated preview.
   - Derive public URLs from the tool's `url` hostname: `https://<domain>/screenshots/<slug>-light.png` (light) and `https://<domain>/screenshots/<slug>-dark.png` (dark).
   - Set `screenshotUrl` = light URL, `screenshotUrlDark` = dark URL (omit `screenshotUrlDark` if no dark variant exists).
8. **Logo** — (optional) the tool's square logomark (transparent background, ideally 40×40 or larger).
   - Default icon URL to try: `https://<domain>/icon.png`
   - Fetch the icon as binary and push it to `public/logos/<slug>.png` on the PR branch in `modryn-studio/modryn-studio-v2` using the GitHub MCP
   - Set `logoUrl` to `/logos/<slug>.png`
   - If the icon cannot be fetched or the URL is unknown, omit `logoUrl` and note it in the PR body
9. **Launched date** — (optional, only if status is `live` or `beta`) ISO date, e.g. `2026-03-01`
10. **Log slug** — (optional) slug of the `/log` post documenting this build. Written to the JSON as `"logSlug": "YYYY-MM-DD-[slug]"`.
11. **Target subreddits** — (optional) 2–4 subreddits where the tool's target users hang out. Used by the `/social` prompt for launch-day distribution. Don't include r/SideProject (always included as founder channel). Example: `["r/webdev", "r/freelance"]`

Then:
- Derive the slug from the name (lowercase, spaces → hyphens, strip special chars)
- Check if `content/tools/<slug>.json` already exists on `modryn-studio/modryn-studio-v2` main branch using the GitHub MCP
- If it exists: update the file with the new values
- If it does not exist: create it
- Include `subreddits` as an array in the JSON if provided (e.g. `"subreddits": ["r/webdev", "r/freelance"]`)
- Include `"logSlug": "YYYY-MM-DD-[slug]"` in the JSON if a log slug was provided
- Use a branch named `tool/<slug>` and open a PR against `main` on `modryn-studio/modryn-studio-v2` with:
  - Title: `tool: add/update <tool name>`
  - Body: the JSON that was written, plus a one-line summary of what changed
- Do NOT commit anything to the current repo except screenshots (which belong in `public/screenshots/`)
- Confirm the PR URL when done
