---
name: assets
description: "Generate all favicons, icons, OG image, and README banner from your logomark."
agent: agent
tools: ['runInTerminal']
---
# Generate Brand Assets

Run the asset generator to produce all favicons, icons, OG image, and README banner from your logomark.

## Steps

1. Check that `public/brand/logomark.png` exists. If it doesn't, stop and tell the user:
   > "Drop your logomark at `public/brand/logomark.png` (1024×1024, transparent background) and re-run `/assets`."

2. Check that ImageMagick is installed by running `magick --version`. If it's not found, stop and tell the user:
   > "ImageMagick is required. Install it from https://imagemagick.org then re-run `/assets`."

3. Run the asset generator:
   ```powershell
   .\scripts\generate-assets.ps1
   ```

4. If the script succeeds, report which files were generated.

5. Write `README.md` — overwrite the entire file with the project README following the `## README Standard` format from `.github/copilot-instructions.md`:
   - Banner image line: `![{site.name}](public/brand/banner.png)`
   - H1: product name only
   - Tagline: one sentence — what the user gets, outcome-focused, no buzzwords
   - Live link: `→ [domain](url)` — read URL from `src/config/site.ts`
   - `---` divider
   - Stack line: read `package.json` dependencies for the core tech list
   - Nothing else

6. Commit the generated assets and README:
   ```powershell
   git add public/ src/app/apple-icon.png README.md
   git commit -m "assets: generate favicons, icons, banner, and README"
   ```

## Rules
- Never push — commit only.
- If the script errors, show the full output and stop.
- Do not modify any source files — this command only runs the generator and commits the output.
