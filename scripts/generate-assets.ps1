# scripts/generate-assets.ps1
# ------------------------------------------------------------------------------
# Generates all favicon, icon, README banner, and palette assets from your
# logomark and brand colors.
# Run from the project root after cloning, and again after any logomark or
# site.ts update.
#
# Requires: ImageMagick (magick) - https://imagemagick.org
#
# -- Rules ---------------------------------------------------------------------
#
#   1. logomark.png MUST have a transparent background. No exceptions.
#      The script will error if the image has no alpha channel.
#
#   2. Grayscale marks (black, white, gray) are auto-detected and inverted
#      where a dark background is used (apple-icon, banner, dark favicon).
#
#   3. Colored marks are used as-is across all outputs.
#
# -- Inputs --------------------------------------------------------------------
#
#   REQUIRED:
#   public/brand/logomark.png         Transparent bg. 1024x1024 recommended.
#
#   OPTIONAL - explicit dark favicon override:
#   public/brand/logomark-dark.png    Skips auto-inversion for icon-dark.png.
#
#   OPTIONAL - auto-generated if absent:
#   public/brand/banner.png           1280x320 README header.
#
# -- Outputs -------------------------------------------------------------------
#
#   app/icon.png                  1024x1024 transparent (Next.js file convention)
#   app/favicon.ico               Multi-res 48/32/16px transparent (Next.js file convention)
#   app/apple-icon.png            180x180 on brand bg (iOS - no transparency support)
#   public/icon-light.png             Favicon for light mode
#   public/icon-dark.png              Favicon for dark mode
#   public/brand/banner.png           1280x320 README banner (if not already provided)
#   public/brand/palette.png          1000x180 brand color swatch sheet
#
#   OG image is handled at build time by app/opengraph-image.tsx - not a static file.
#
# ------------------------------------------------------------------------------

Set-Location (Split-Path -Parent $PSScriptRoot)

$logomark     = "public\brand\logomark.png"
$logomarkDark = "public\brand\logomark-dark.png"
$banner       = "public\brand\banner.png"

# -- Guards --------------------------------------------------------------------
if (-not (Test-Path $logomark)) {
    Write-Host ""
    Write-Host "  ERROR: $logomark not found." -ForegroundColor Red
    Write-Host "  Drop your logomark (1024x1024, transparent background) at that path and re-run." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERROR: ImageMagick not found." -ForegroundColor Red
    Write-Host "  Install from https://imagemagick.org then re-run." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Enforce transparent background rule.
$hasAlpha = magick identify -format "%A" $logomark 2>$null
if ($hasAlpha -eq "False") {
    Write-Host ""
    Write-Host "  ERROR: $logomark does not have a transparent background." -ForegroundColor Red
    Write-Host "  Export your logomark with a transparent (alpha) background and re-run." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# -- Read site name + brand bg color from config/site.ts ----------------------
$siteName = "Your Site"
$bgColor  = "#111111"
$siteTs   = "src\config\site.ts"
if (Test-Path $siteTs) {
    $nameLine = Select-String -Path $siteTs -Pattern "name:\s*'([^']+)'" | Select-Object -First 1
    if ($nameLine) {
        $m = [regex]::Match($nameLine.Line, "name:\s*'([^']+)'")
        if ($m.Success -and $m.Groups[1].Value -notmatch 'TODO') { $siteName = $m.Groups[1].Value }
    }
    $bgLine = Select-String -Path $siteTs -Pattern "bg:\s*'([^']+)'" | Select-Object -First 1
    if ($bgLine) {
        $m = [regex]::Match($bgLine.Line, "bg:\s*'([^']+)'")
        if ($m.Success -and $m.Groups[1].Value -notmatch 'TODO') { $bgColor = $m.Groups[1].Value }
    }
}

function Get-TextColor($hexColor) {
    $r = [Convert]::ToInt32($hexColor.Substring(1,2), 16) / 255
    $g = [Convert]::ToInt32($hexColor.Substring(3,2), 16) / 255
    $b = [Convert]::ToInt32($hexColor.Substring(5,2), 16) / 255
    $toLinear = { param($c) if ($c -le 0.04045) { $c / 12.92 } else { [Math]::Pow(($c + 0.055) / 1.055, 2.4) } }
    $L = 0.2126 * (&$toLinear $r) + 0.7152 * (&$toLinear $g) + 0.0722 * (&$toLinear $b)
    if ($L -gt 0.179) { return "#1C1410" } else { return "#F5F5F5" }
}
$textColor = Get-TextColor $bgColor

Write-Host ""
Write-Host "  Generating assets - site: $siteName" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "src\app")) { New-Item -ItemType Directory -Path "src\app" | Out-Null }

# -- Detect mark type ----------------------------------------------------------
$maxSat      = [float](magick $logomark -colorspace HSL -channel Saturation -separate -format "%[fx:maxima]" info: 2>$null)
$isGrayscale = $maxSat -lt 0.05

$negateFrag  = if ($isGrayscale) { @('-channel', 'RGB', '-negate') } else { @() }

# -- icon.png - browser tab favicon --------------------------------------------
magick $logomark -background none -trim +repage -resize 1024x1024 -gravity Center -background none -extent 1024x1024 "src\app\icon.png"
Write-Host "  + app/icon.png"

# -- favicon.ico - legacy multi-resolution -------------------------------------
magick $logomark -background none -trim +repage -resize 256x256 -gravity Center -background none -extent 256x256 -define icon:auto-resize=48,32,16 "src\app\favicon.ico"
Write-Host "  + app/favicon.ico"

# -- apple-icon.png - iOS home screen ------------------------------------------
# iOS does not support transparent icons - always composite onto brand bg.
magick -size 180x180 xc:"$bgColor" `
    '(' $logomark -background none -trim +repage $negateFrag -resize 140x140 ')' `
    -gravity Center -composite "src\app\apple-icon.png"
Write-Host "  + app/apple-icon.png"

# -- Favicon pair - light / dark mode ------------------------------------------
if (Test-Path $logomarkDark) {
    Write-Host "  favicon mode: DUAL" -ForegroundColor DarkGray
    Copy-Item $logomark     "public\icon-light.png"
    Copy-Item $logomarkDark "public\icon-dark.png"
} elseif ($isGrayscale) {
    Write-Host "  favicon mode: AUTO (grayscale - inverting for dark mode)" -ForegroundColor DarkGray
    Copy-Item $logomark "public\icon-light.png"
    magick $logomark -background none -channel RGB -negate "public\icon-dark.png"
} else {
    Write-Host "  favicon mode: SINGLE (colored mark)" -ForegroundColor DarkGray
    Copy-Item $logomark "public\icon-light.png"
    Copy-Item $logomark "public\icon-dark.png"
}
Write-Host "  + public/icon-light.png"
Write-Host "  + public/icon-dark.png"

# -- banner.png - README header ------------------------------------------------
if (Test-Path $banner) {
    Write-Host "  ~ public/brand/banner.png (skipped - file already exists)"
} else {
    if (-not (Test-Path "public\brand")) { New-Item -ItemType Directory -Path "public\brand" | Out-Null }
    magick -size 1280x320 xc:"$bgColor" `
        '(' $logomark -background none -trim +repage $negateFrag -resize 160x160 ')' `
        -gravity West -geometry +100+0 -composite `
        -gravity West -font "Arial-Bold" -pointsize 72 -fill "$textColor" -annotate +300+0 $siteName `
        $banner
    Write-Host "  + public/brand/banner.png (auto-generated)"
}

# -- palette.png - brand color swatches ----------------------------------------
& "$PSScriptRoot\generate-palette.ps1"

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
if ($siteName -eq "Your Site") {
    Write-Host "  Tip: fill in config/site.ts then re-run to stamp your site name on the banner." -ForegroundColor DarkGray
}
Write-Host ""
