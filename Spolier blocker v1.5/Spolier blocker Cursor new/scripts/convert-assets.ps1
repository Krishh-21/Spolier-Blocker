Write-Host "Running asset conversion for Spoiler Shield..."

if (-Not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not available in PATH. Install Node.js first: https://nodejs.org/"
  exit 1
}

Push-Location $PSScriptRoot\..
try {
  Write-Host "Installing npm dependencies (sharp)..."
  npm install

  Write-Host "Converting SVG assets to PNGs..."
  npm run convert-assets

  Write-Host "Done. Generated files are in the project root and assets/."
}
finally {
  Pop-Location
}

Write-Host "If sharp fails to install, you can use Inkscape or ImageMagick as fallback. Example (Inkscape):"
Write-Host "inkscape assets/icon-shield.svg --export-filename=icon128.png --export-width=128 --export-height=128"
Write-Host "magick convert assets/welcome-hero.svg -resize 1280x800 assets/welcome-hero-1280x800.png"
