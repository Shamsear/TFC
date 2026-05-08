# PowerShell Script to migrate images to a separate repository
# This will significantly speed up your builds

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Image Migration Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Configuration
$IMAGE_DIR = "public/player_cards"
$NEW_REPO_URL = "https://github.com/Shamsear/TFC-Images.git"  # Update this!
$TEMP_DIR = "temp_images"

Write-Host ""
Write-Host "Step 1: Create the new repository on GitHub" -ForegroundColor Yellow
Write-Host "  1. Go to https://github.com/new"
Write-Host "  2. Name it: TFC-Images"
Write-Host "  3. Make it PUBLIC"
Write-Host "  4. Don't initialize with README"
Write-Host ""
Read-Host "Press Enter once you've created the repo"

Write-Host ""
Write-Host "Step 2: Cloning and preparing new repo..." -ForegroundColor Green
git clone $NEW_REPO_URL $TEMP_DIR
Set-Location $TEMP_DIR

Write-Host ""
Write-Host "Step 3: Copying images..." -ForegroundColor Green
Copy-Item -Path "..\$IMAGE_DIR" -Destination ".\player_cards" -Recurse

Write-Host ""
Write-Host "Step 4: Committing images to new repo..." -ForegroundColor Green
git add .
git commit -m "Initial commit: Add player card images"

Write-Host ""
Write-Host "Step 5: Pushing to new repo..." -ForegroundColor Green
git push origin main

Set-Location ..

Write-Host ""
Write-Host "Step 6: Removing images from current repo..." -ForegroundColor Green
git rm -r $IMAGE_DIR
git commit -m "Remove images (moved to separate repo)"

Write-Host ""
Write-Host "Step 7: Creating .gitignore for local images..." -ForegroundColor Green
Add-Content -Path ".gitignore" -Value "`n$IMAGE_DIR/"
git add .gitignore
git commit -m "Add player_cards to gitignore"

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Push changes: git push"
Write-Host "2. Update your app to use CDN URLs"
Write-Host "3. Your builds will now be MUCH faster!"
Write-Host ""
Write-Host "CDN URL format:" -ForegroundColor Cyan
Write-Host "https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/IMAGE_NAME.png"
Write-Host ""
