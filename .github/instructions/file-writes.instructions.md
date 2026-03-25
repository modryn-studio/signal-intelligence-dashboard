---
applyTo: '**'
---

# File Writing Rules

## Never use PowerShell `Set-Content` or `Out-File` for JSON files

PowerShell's `Set-Content` writes UTF-8 with BOM by default. A BOM in `package.json`, `tsconfig.json`, or any JSON file **breaks the build**  Node.js, webpack, and Turbopack all choke on the leading BOM byte.

**When writing or patching JSON files, always use one of:**

### Option 1  Node.js (preferred)
```powershell
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.lint = 'eslint src/';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
"
```

### Option 2  PowerShell with explicit no-BOM encoding
```powershell
[System.IO.File]::WriteAllText(
  $path,
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)
```

## Applies to any file parsed as structured data by Node.js

- `package.json`
- `tsconfig.json`
- Any `*.json` config file

Markdown, `.ts`, `.tsx`, `.css` files are safe  only files parsed as JSON/JS are sensitive to BOM.