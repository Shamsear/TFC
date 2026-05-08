# Migration Script using Git LFS for large files
# Git LFS allows storing large files on GitHub

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Image Migration with Git LFS" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

$IMAGE_DIR = "public/player_cards"
$NEW_REPO_URL = "https://github.com/Shamsear/TFC-Images.git"
$TEMP_DIR = "temp_lfs_migration"

# Check Git LFS
Write-Host "Checking Git LFS..." -ForegroundColor Green
$lfsInstalled = git lfs version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git LFS is not installed!" -ForegroundColor Red
    Write-Host "Install from: https://git-lfs.github.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use Chocolatey: choco install git-lfs" -ForegroundColor Yellow
    exit 1
}
Write-Host "Git LFS is installed" -ForegroundColor Green
Write-Host ""

# Clone repo
Write-Host "Cloning repository..." -ForegroundColor Green
if (Test-Path $TEMP_DIR) {
    Remove-Item -Path $TEMP_DIR -Recurse -Force
}
git clone $NEW_REPO_URL $TEMP_DIR
Set-Location $TEMP_DIR

# Initialize LFS
Write-Host "Initializing Git LFS..." -ForegroundColor Green
git lfs install
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.jpeg"
git add .gitattributes
git commit -m "Add Git LFS tracking"
git push origin main

# Copy images
Write-Host "Copying images..." -ForegroundColor Green
Copy-Item -Path "..\$IMAGE_DIR" -Destination ".\player_cards" -Recurse

# Commit with LFS
Write-Host "Committing with Git LFS..." -ForegroundColor Green
git add .
git commit -m "Add player card images via Git LFS"

Write-Host "Pushing to GitHub with LFS..." -ForegroundColor Green
git push origin main

Set-Location ..

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "===================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Images uploaded with Git LFS" -ForegroundColor Green
    Write-Host "Verify at: https://github.com/Shamsear/TFC-Images" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next: Run .\cleanup-original-repo.ps1" -ForegroundColor Yellow
} else {
    Write-Host "Push failed!" -ForegroundColor Red
}

Remove-Item -Path $TEMP_DIR -Recurse -Force
