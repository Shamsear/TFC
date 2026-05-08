# Cleanup Script - Remove images from original repo after migration
# Run this AFTER verifying images are in the new repo

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Cleanup Original Repository" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

$IMAGE_DIR = "public/player_cards"

Write-Host ""
Write-Host "WARNING: This will remove images from your current repo!" -ForegroundColor Red
Write-Host "Make sure you've verified the images are in the new repo first!" -ForegroundColor Red
Write-Host ""
Write-Host "New repo URL: https://github.com/Shamsear/TFC-Images" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Type 'YES' to continue"

if ($confirmation -ne "YES") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 1: Removing images from git..." -ForegroundColor Green
git rm -r $IMAGE_DIR
git commit -m "Remove player card images (moved to TFC-Images repo)"

Write-Host ""
Write-Host "Step 2: Adding to .gitignore..." -ForegroundColor Green
$gitignorePath = ".gitignore"
$ignoreEntry = "`n# Player card images (stored in separate repo)`n$IMAGE_DIR/"

if (Test-Path $gitignorePath) {
    Add-Content -Path $gitignorePath -Value $ignoreEntry
} else {
    Set-Content -Path $gitignorePath -Value $ignoreEntry
}

git add .gitignore
git commit -m "Add player_cards to gitignore"

Write-Host ""
Write-Host "Step 3: Creating local directory for development..." -ForegroundColor Green
New-Item -ItemType Directory -Path $IMAGE_DIR -Force | Out-Null
Set-Content -Path "$IMAGE_DIR/README.md" -Value @"
# Player Card Images

Images are stored in a separate repository: https://github.com/Shamsear/TFC-Images

For local development:
1. Download images from the repo
2. Place them in this directory
3. This directory is gitignored

Production uses CDN: https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/
"@

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Push changes: git push"
Write-Host "2. Your next build will be MUCH faster!"
Write-Host "3. Update your app code to use CDN URLs"
Write-Host ""
Write-Host "For local development:" -ForegroundColor Cyan
Write-Host "  Download images from: https://github.com/Shamsear/TFC-Images"
Write-Host "  Place in: $IMAGE_DIR/"
Write-Host ""
