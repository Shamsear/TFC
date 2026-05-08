# Player Photo Format Update

## Change Summary

The system has been updated to use **WebP format** for player photos instead of JPG.

## What Changed

### 1. Photo File Format
- **Old**: `/players/{playerId}.jpg`
- **New**: `/players/{playerId}.webp`

### 2. Updated Files
- ✅ `app/api/import/confirm/route.ts` - Import API (non-streaming)
- ✅ `app/api/import/stream/route.ts` - Import API (streaming with real-time progress)
- ✅ `PLAYER-PHOTOS-GUIDE.md` - Documentation updated

### 3. Benefits of WebP
- **Better compression**: 25-35% smaller file sizes than JPG
- **Better quality**: Superior quality at same file size
- **Transparency support**: Like PNG but smaller
- **Browser support**: All modern browsers (Chrome, Firefox, Safari, Edge)

## Action Required

### For New Imports
No action needed! The system will automatically use `.webp` format for all new player imports.

### For Existing Photos (if you have JPG files)

#### Option 1: Rename Existing Files
If you already have JPG photos in `public/players/`, rename them:

```bash
# Windows PowerShell
cd public/players
Get-ChildItem *.jpg | Rename-Item -NewName { $_.Name -replace '.jpg$','.webp' }
```

**Note**: This just renames the files. They're still JPG format internally, but will work fine.

#### Option 2: Convert to True WebP (Recommended)
For better compression and quality, convert to true WebP format:

**Using Online Tools:**
1. Visit [Squoosh.app](https://squoosh.app)
2. Upload your JPG files
3. Select WebP format
4. Set quality to 85%
5. Download converted files

**Using Command Line (cwebp):**

```bash
# Install cwebp
# Windows: Download from https://developers.google.com/speed/webp/download
# macOS: brew install webp
# Linux: sudo apt-get install webp

# Convert single file
cwebp -q 85 input.jpg -o output.webp

# Batch convert all JPG files in directory
for file in *.jpg; do cwebp -q 85 "$file" -o "${file%.jpg}.webp"; done
```

**Using PowerShell Script (Windows):**

```powershell
# Assuming you have cwebp.exe in your PATH or current directory
Get-ChildItem *.jpg | ForEach-Object {
    $output = $_.Name -replace '.jpg$','.webp'
    & cwebp -q 85 $_.FullName -o $output
}
```

### For Database Updates (if you have existing data)

If you already have players in the database with `.jpg` photo URLs, you can update them:

```sql
-- Update all photo URLs from .jpg to .webp
UPDATE base_players 
SET "photoUrl" = REPLACE("photoUrl", '.jpg', '.webp')
WHERE "photoUrl" LIKE '%.jpg';
```

Run this in your database client or create a migration file.

## File Naming Convention

Player photos must be named exactly as:

```
public/players/{playerId}.webp
```

### Examples:
- `public/players/110718.webp` - Kylian Mbappé
- `public/players/133543.webp` - Erling Haaland
- `public/players/57123.webp` - Mohamed Salah

## Verification

To verify the update is working:

1. **Check Import API**: Import a player and verify the photo URL in database is `.webp`
2. **Check File System**: Ensure photos in `public/players/` have `.webp` extension
3. **Check Display**: View player pages and verify photos load correctly

## Troubleshooting

### Photos not showing after update?

1. **Check file extensions**: Ensure all files are `.webp` (lowercase)
2. **Clear cache**: 
   - Browser cache: Ctrl+Shift+R (hard refresh)
   - Next.js cache: Delete `.next/cache/images/`
3. **Restart dev server**: Stop and restart `npm run dev`
4. **Check database**: Verify `photoUrl` column has `.webp` extension

### Mixed JPG and WebP?

If you have some JPG and some WebP files:
- The system will look for `.webp` files
- JPG files won't be found unless renamed
- Convert or rename all to `.webp` for consistency

## Placeholder

A placeholder SVG is available at `public/players/placeholder.svg` for players without photos.

## Questions?

Refer to the updated `PLAYER-PHOTOS-GUIDE.md` for complete documentation.
