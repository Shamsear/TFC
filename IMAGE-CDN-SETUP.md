# Image CDN Setup

Player photos and cards are now fetched from a separate GitHub repository to reduce the main repository size and improve build times.

## GitHub Repository

**Repository:** https://github.com/Shamsear/TFC-Images

### Structure

```
TFC-Images/
├── player_cards/
│   ├── 17592186045227.png
│   ├── 17593259920868.png
│   └── ...
└── player_photos/
    ├── 17592186045227.png
    ├── 17593259920868.png
    └── ...
```

## CDN URLs

### Production (CDN - Fast, Cached)
- **Base URL:** `https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main`
- **Player Cards:** `https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/{playerId}.png`
- **Player Photos:** `https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_photos/{playerId}.png`

### Development (Raw GitHub - Faster Updates)
- **Base URL:** `https://raw.githubusercontent.com/Shamsear/TFC-Images/main`
- **Player Cards:** `https://raw.githubusercontent.com/Shamsear/TFC-Images/main/player_cards/{playerId}.png`
- **Player Photos:** `https://raw.githubusercontent.com/Shamsear/TFC-Images/main/player_photos/{playerId}.png`

## Usage in Code

### Import the helper functions

```typescript
import { 
  getPlayerCardById, 
  getPlayerPhotoUrl, 
  getPhotoUrlFromDb 
} from '@/lib/image-cdn'
```

### Get player card URL

```typescript
// Using player ID
const cardUrl = getPlayerCardById('17592186045227')
// Returns: https://cdn.jsdelivr.net/gh/Shamsear/TFC-Images@main/player_cards/17592186045227.png

// Using filename
const cardUrl = getPlayerCardUrl('17592186045227.png')
```

### Get player photo URL

```typescript
// Using player ID
const photoUrl = getPlayerPhotoUrl('17592186045227.png')

// From database photoUrl field
const photoUrl = getPhotoUrlFromDb(player.photoUrl)
```

## Adding New Images

### 1. Clone the TFC-Images repository

```bash
git clone https://github.com/Shamsear/TFC-Images.git
cd TFC-Images
```

### 2. Add images to the appropriate folder

```bash
# Add player cards
cp /path/to/cards/*.png player_cards/

# Add player photos
cp /path/to/photos/*.png player_photos/
```

### 3. Commit and push

```bash
git add .
git commit -m "Add new player images"
git push origin main
```

### 4. Wait for CDN cache (if using production)

- **jsdelivr CDN:** Updates within 12-24 hours
- **Raw GitHub:** Updates immediately

To force CDN refresh:
- Use version tags: `@v1.0.0` instead of `@main`
- Or purge cache: https://www.jsdelivr.com/tools/purge

## Benefits

✅ **Smaller main repository** - No large image files in git history  
✅ **Faster builds** - Vercel doesn't need to clone/process images  
✅ **Faster clones** - Main repo is much smaller  
✅ **CDN performance** - Images served from global CDN  
✅ **Easy updates** - Update images without redeploying the app  
✅ **Version control** - Images have their own git history  

## Fallback Images

If an image is not found, the app will fall back to:
- `/default-player-card.png` for player cards
- `/default-player.png` for player photos

Make sure these files exist in the `public/` directory.

## Environment Variables

No environment variables needed! The CDN URLs are configured in `lib/image-cdn.ts`.

## Troubleshooting

### Images not loading

1. Check if the image exists in the TFC-Images repository
2. Verify the filename matches the player ID
3. Check browser console for CORS errors
4. Try the raw GitHub URL directly in browser

### CDN cache issues

- Use raw GitHub URLs in development
- Use version tags for production
- Purge CDN cache if needed

### Image format

- All images should be PNG format
- Filename should match player ID: `{playerId}.png`
- Recommended size: 400x400px for photos, 600x800px for cards
