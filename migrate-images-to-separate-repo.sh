#!/bin/bash

# Script to migrate images to a separate repository
# This will significantly speed up your builds

echo "==================================="
echo "Image Migration Script"
echo "==================================="

# Configuration
IMAGE_DIR="public/player_cards"
NEW_REPO_URL="https://github.com/Shamsear/TFC-Images.git"  # Update this!
TEMP_DIR="temp_images"

echo ""
echo "Step 1: Create the new repository on GitHub"
echo "  1. Go to https://github.com/new"
echo "  2. Name it: TFC-Images"
echo "  3. Make it PUBLIC"
echo "  4. Don't initialize with README"
echo ""
read -p "Press Enter once you've created the repo..."

echo ""
echo "Step 2: Cloning and preparing new repo..."
git clone $NEW_REPO_URL $TEMP_DIR
cd $TEMP_DIR

echo ""
echo "Step 3: Copying images..."
cp -r ../$IMAGE_DIR ./player_cards

echo ""
echo "Step 4: Committing images to new repo..."
git add .
git commit -m "Initial commit: Add player card images"

echo ""
echo "Step 5: Pushing to new repo..."
git push origin main

cd ..

echo ""
echo "Step 6: Removing images from current repo..."
git rm -r $IMAGE_DIR
git commit -m "Remove images (moved to separate repo)"

echo ""
echo "Step 7: Creating .gitignore for local images..."
echo "$IMAGE_DIR/" >> .gitignore
git add .gitignore
git commit -m "Add player_cards to gitignore"

echo ""
echo "==================================="
echo "Migration Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Push changes: git push"
echo "2. Update your app to use CDN URLs"
echo "3. Your builds will now be MUCH faster!"
echo ""
echo "CDN URL format:"
echo "https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/IMAGE_NAME.png"
echo ""
