# Image Migration Guide - 10GB+ Images

## Why Migrate?

Your current setup stores 10GB+ images in the same repo, causing:
- ❌ 5+ minute build times
- ❌ 5+ minute clone times  
- ❌ Slow git operations
- ❌ Wasted Vercel build minutes

After migration:
- ✅ ~30 second builds
- ✅ ~10 second clones
- ✅ Free global CDN
- ✅ Unlimited storage

## Migration Process (Automated Batches)

### Step 1: Create New Repository

1. Go to https://github.com/new
2. Repository name: `TFC-Images`
3. Make it **PUBLIC**
4. **Don't** initialize with README
5. Click "Create repository"

### Step 2: Run Batch Migration

```powershell
.\migrate-images-batched.ps1
```

**What it does:**
- Processes images in 500MB batches
- Automatically commits and pushes each batch
- Handles network errors with retries
- Shows progress for each batch
- Takes ~30-60 minutes for 10GB

**During migration:**
- Don't close the terminal
- Don't interrupt the process
- It will show progress for each batch

### Step 3: Verify Migration

1. Go to https://github.com/Shamsear/TFC-Images
2. Check that all images are there
3. Verify file count matches

### Step 4: Cleanup Original Repo

```powershell
.\cleanup-original-repo.ps1
```

**What it does:**
- Removes images from current repo
- Adds to .gitignore
- Creates README for local development

### Step 5: Push Changes

```powershell
git push
```

Your next build will be **10x faster**!

## Using Images in Your App

### Option 1: Use the Helper Component (Recommended)

```tsx
import PlayerCardImage from '@/components/PlayerCardImage';

<PlayerCardImage 
  filename="player_123.png" 
  alt="Player Name"
  width={300}
  height={400}
/>
```

### Option 2: Use the Helper Function

```tsx
import { getPlayerCardUrl } from '@/lib/image-cdn';

const imageUrl = getPlayerCardUrl('player_123.png');
// Production: https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/player_123.png
// Development: /player_cards/player_123.png
```

### Option 3: Direct URL

```tsx
<img src="https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/player_123.png" />
```

## Local Development

For offline development:

1. Clone the images repo:
```bash
git clone https://github.com/Shamsear/TFC-Images.git
```

2. Copy images to your project:
```bash
cp -r TFC-Images/player_cards public/
```

3. The app will automatically use local images in development

## CDN URL Format

```
https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/IMAGE_NAME.png
```

**Benefits:**
- Free global CDN
- Automatic caching
- Fast delivery worldwide
- No bandwidth limits

## Troubleshooting

### Migration fails midway
- Check internet connection
- Run the script again (it will continue from where it stopped)

### Images not showing after migration
- Verify images are in new repo
- Check CDN URL format
- Wait 5 minutes for CDN cache

### Build still slow
- Make sure you ran `cleanup-original-repo.ps1`
- Make sure you pushed the changes
- Check that `public/player_cards/` is in `.gitignore`

## Rollback (If Needed)

If something goes wrong:

1. Don't panic - images are safe in new repo
2. You can always re-clone from TFC-Images
3. Original repo still has images in git history

## Questions?

- Check new repo: https://github.com/Shamsear/TFC-Images
- Test CDN URL: https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/
- Verify .gitignore includes `public/player_cards/`
