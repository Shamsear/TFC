# Player Photos Guide

## Photo Location

Player photos should be placed in the `public/players/` directory.

## File Naming Convention

Photos must be named using the player's ID from the eFootball database:

```
public/players/{playerId}.webp
```

### Examples:
- `public/players/110718.webp` - Kylian Mbappé
- `public/players/133543.webp` - Erling Haaland
- `public/players/57123.webp` - Mohamed Salah
- `public/players/16781738.webp` - Cristiano Ronaldo

## Supported Formats

- **Primary**: `.webp` (recommended for best compression)
- **Alternative**: `.jpg`, `.png`

## Photo Specifications

### Recommended:
- **Size**: 300x300px to 500x500px
- **Format**: WebP
- **Quality**: 80-90%
- **Background**: Transparent or solid color
- **Aspect Ratio**: 1:1 (square)

### Minimum:
- **Size**: 150x150px
- **Format**: WebP/JPG/PNG
- **File Size**: < 100KB per photo (WebP offers better compression)

## Directory Structure

```
public/
├── players/
│   ├── 110718.webp
│   ├── 133543.webp
│   ├── 57123.webp
│   ├── 16781738.webp
│   └── ... (more player photos)
├── teams/
│   └── ... (team logos)
└── logo.jpeg
```

## How Photos Are Used

1. **Import Process**: When importing players, the system stores the photo URL as `/players/{playerId}.webp`
2. **Display**: Photos are displayed using Next.js Image component with the stored URL
3. **Fallback**: If a photo doesn't exist, a placeholder or initials are shown

## Getting Player IDs

Player IDs can be found:
1. In the eFootball database (`player_id` column)
2. In the import preview (shown for each player)
3. In the database after import (`base_players.id` field)

## Bulk Photo Management

### Option 1: Manual Upload
1. Create the `public/players/` directory if it doesn't exist
2. Copy all player photos with correct naming
3. Photos will be automatically available

### Option 2: Script Upload
You can create a script to batch rename and copy photos:

```bash
# Example: Rename photos based on a CSV mapping
# player_name,player_id
# Kylian Mbappé,110718
# Erling Haaland,133543
```

## Fallback Behavior

If a player photo is missing:
- The system will show a placeholder
- No errors will occur
- The photo URL is still stored in the database
- You can add the photo later and it will appear automatically

## Photo Sources

Common sources for player photos:
- Official eFootball assets
- Team websites
- Sports databases (with proper licensing)
- Custom photography

**Note**: Ensure you have proper rights/licenses for any photos you use.

## Testing

To verify photos are working:
1. Place a test photo: `public/players/test.webp`
2. Access it at: `http://localhost:3000/players/test.webp`
3. If visible, your setup is correct

## Troubleshooting

### Photo not showing?
1. Check file name matches player ID exactly
2. Verify file is in `public/players/` directory
3. Check file extension is `.webp` (lowercase)
4. Clear browser cache
5. Restart Next.js dev server

### Wrong photo showing?
1. Verify player ID in database matches filename
2. Check for duplicate player IDs
3. Clear Next.js image cache: delete `.next/cache/images/`

## Performance Tips

1. **Optimize photos**: Use tools like Squoosh or cwebp for WebP conversion
2. **Consistent sizing**: Keep all photos the same dimensions
3. **WebP format**: Already using WebP for best compression and quality
4. **Lazy loading**: Next.js Image component handles this automatically

## Converting to WebP

If you have JPG/PNG photos, convert them to WebP:

### Using online tools:
- Squoosh.app (Google's tool)
- CloudConvert.com

### Using command line (cwebp):
```bash
# Install cwebp (part of libwebp)
# macOS: brew install webp
# Ubuntu: sudo apt-get install webp

# Convert single file
cwebp -q 85 input.jpg -o output.webp

# Batch convert all JPG files
for file in *.jpg; do cwebp -q 85 "$file" -o "${file%.jpg}.webp"; done
```
