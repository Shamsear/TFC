# Simple Image Migration Script
# Migrates all images to new repository

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Image Migration to TFC-Images" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$IMAGE_DIR = "public/player_cards"
$NEW_REPO_URL = "https://github.com/Shamsear/TFC-Images.git"
$TEMP_DIR = "temp_images_migration"

# Check if directory exists
if (-not (Test-Path $IMAGE_DIR)) {
    Write-Host "Error: $IMAGE_DIR not found!" -ForegroundColor Red
    exit 1
}

# Calculate size
Write-Host "Calculating size..." -ForegroundColor Green
$totalSize = (Get-ChildItem -Path $IMAGE_DIR -Recurse -File | Measure-Object -Property Length -Sum).Sum
$totalSizeGB = [math]::Round($totalSize / 1GB, 2)
Write-Host "Total size: $totalSizeGB GB" -ForegroundColor Cyan
Write-Host ""

# Clone new repo
Write-Host "Cloning TFC-Images repository..." -ForegroundColor Green
if (Test-Path $TEMP_DIR) {
    Remove-Item -Path $TEMP_DIR -Recurse -Force
}
git clone $NEW_REPO_URL $TEMP_DIR

if (-not (Test-Path $TEMP_DIR)) {
    Write-Host "Error: Failed to clone repository" -ForegroundColor Red
    exit 1
}

# Copy images
Write-Host "Copying images..." -ForegroundColor Green
Copy-Item -Path $IMAGE_DIR -Destination "$TEMP_DIR/player_cards" -Recurse

# Commit and push
Set-Location $TEMP_DIR
Write-Host "Committing..." -ForegroundColor Green
git add .
git commit -m "Add player card images"

Write-Host "Pushing to GitHub (this may take a while)..." -ForegroundColor Green
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Migration Complete!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify images at: https://github.com/Shamsear/TFC-Images"
    Write-Host "2. Run: .\cleanup-original-repo.ps1"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "Push failed! This is likely due to file size." -ForegroundColor Red
    Write-Host "GitHub has a 2GB push limit." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use Git LFS or split into batches manually" -ForegroundColor Yellow
}

Set-Location ..
Remove-Item -Path $TEMP_DIR -Recurse -Force
