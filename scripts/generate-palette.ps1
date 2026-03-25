# scripts/generate-palette.ps1
# ------------------------------------------------------------------------------
# Generates public/brand/palette.png â€” a 1000x180 color swatch sheet â€” by
# reading the 5 color tokens from app/globals.css @theme inline block.
#
# Run any time after filling in colors in globals.css. No logomark required.
# Also called automatically by generate-assets.ps1.
#
# Requires: ImageMagick (magick) - https://imagemagick.org
#
# -- Tokens read ---------------------------------------------------------------
#
#   --color-accent      Accent
#   --color-secondary   Secondary
#   --color-bg          Background
#   --color-text        Text
#   --color-muted       Muted
#
# -- Output --------------------------------------------------------------------
#
#   public/brand/palette.png    1000x180 swatch sheet (5 x 200px swatches)
#
# ------------------------------------------------------------------------------

Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERROR: ImageMagick not found." -ForegroundColor Red
    Write-Host "  Install from https://imagemagick.org then re-run." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

$cssPath = "src\app\globals.css"
if (-not (Test-Path $cssPath)) {
    Write-Host ""
    Write-Host "  ERROR: $cssPath not found." -ForegroundColor Red
    Write-Host ""
    exit 1
}

$css = Get-Content $cssPath -Raw

$tokenMap = [ordered]@{
    '--color-accent'    = 'Accent'
    '--color-secondary' = 'Secondary'
    '--color-bg'        = 'Background'
    '--color-text'      = 'Text'
    '--color-muted'     = 'Muted'
}

$palette = [ordered]@{}
foreach ($token in $tokenMap.Keys) {
    $pattern = [regex]::Escape($token) + '\s*:\s*(#[0-9a-fA-F]{3,8})'
    $m = [regex]::Match($css, $pattern)
    if ($m.Success) { $palette[$tokenMap[$token]] = $m.Groups[1].Value }
}

if ($palette.Count -lt 5) {
    $missing = $tokenMap.Values | Where-Object { $palette.Keys -notcontains $_ }
    Write-Host ""
    Write-Host "  ERROR: $($palette.Count)/5 color tokens found in $cssPath." -ForegroundColor Red
    Write-Host "  Missing: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host "  Note: This project uses oklch values in :root and hex aliases in @theme." -ForegroundColor Yellow
    Write-Host "  Add hex values for the missing tokens in the @theme block in globals.css." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

if (-not (Test-Path "public\brand")) { New-Item -ItemType Directory -Path "public\brand" | Out-Null }

Write-Host "  Generating palette..." -ForegroundColor Cyan

$tmpFiles = @()
$idx = 0
foreach ($label in $palette.Keys) {
    $hex = $palette[$label]
    $out = "tmp_sw_$idx.png"
    $tmpFiles += $out
    # Each swatch: 200x180 â€” top 120px solid color, bottom 60px cream label strip
    magick `
        '(' -size 200x120 xc:"$hex" ')' `
        '(' -size 200x60 xc:'#FFFAF5' `
            -font 'Arial-Bold' -pointsize 13 -fill '#1C1410' `
            -gravity North -annotate '+0+8' "$label" `
            -font 'Arial' -pointsize 11 -fill '#9C8070' `
            -gravity South -annotate '+0+10' "$hex" ')' `
        -append "$out"
    $idx++
}

magick $tmpFiles +append "public\brand\palette.png"
$tmpFiles | Remove-Item -ErrorAction SilentlyContinue

Write-Host "  + public/brand/palette.png"
