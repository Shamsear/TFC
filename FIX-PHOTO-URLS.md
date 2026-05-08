# Fix Player Photo URLs - Complete Guide

## Problem
All existing players in the database have photo URLs ending in `.jpg`, but the system now uses `.webp` format for better compression and performance.

## Solution
Run the SQL migration to update all existing photo URLs from `.jpg` to `.webp`.

---

## Step 1: Run the SQL Migration

### Option A: Using psql (Command Line)

```bash
# Connect to your database and run the migration
psql -U your_username -d your_database_name -f prisma/migrations/update_photo_urls_to_webp.sql
```

Replace:
- `your_username` with your PostgreSQL username
- `your_database_name` with your database name

### Option B: Using Database GUI (pgAdmin, DBeaver, etc.)

1. Open your database client
2. Connect to your database
3. Open the file `prisma/migrations/update_photo_urls_to_webp.sql`
4. Execute the entire script
5. Review the output to confirm updates

### Option C: Using Node.js Script

Create a file `scripts/fix-photo-urls.js`:

```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixPhotoUrls() {
  console.log('Starting photo URL migration...')
  
  // Count before
  const before = await prisma.base_players.count({
    where: {
      photoUrl: {
        contains: '.jpg'
      }
    }
  })
  
  console.log(`Found ${before} players with .jpg URLs`)
  
  // Update all .jpg to .webp
  const result = await prisma.$executeRaw`
    UPDATE base_players 
    SET "photoUrl" = REPLACE("photoUrl", '.jpg', '.webp'),
        "updatedAt" = NOW()
    WHERE "photoUrl" LIKE '%.jpg'
  `
  
  console.log(`Updated ${result} records`)
  
  // Count after
  const after = await prisma.base_players.count({
    where: {
      photoUrl: {
        contains: '.webp'
      }
    }
  })
  
  console.log(`Now ${after} players have .webp URLs`)
  console.log('Migration complete!')
}

fixPhotoUrls()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

Then run:
```bash
node scripts/fix-photo-urls.js
```

---

## Step 2: Verify the Migration

### Check Database Records

```sql
-- Count photo URL formats
SELECT 
    COUNT(*) as total_players,
    COUNT(CASE WHEN "photoUrl" LIKE '%.jpg' THEN 1 END) as jpg_count,
    COUNT(CASE WHEN "photoUrl" LIKE '%.webp' THEN 1 END) as webp_count
FROM base_players;
```

Expected result:
- `jpg_count` should be **0**
- `webp_count` should equal `total_players`

### Check Sample Records

```sql
-- View sample of updated records
SELECT id, name, "photoUrl" 
FROM base_players 
ORDER BY "updatedAt" DESC 
LIMIT 10;
```

All `photoUrl` values should end with `.webp`

---

## Step 3: Rename Physical Photo Files

If you have actual photo files in `public/players/`, rename them from `.jpg` to `.webp`:

### Windows PowerShell:
```powershell
cd public/players
Get-ChildItem *.jpg | Rename-Item -NewName { $_.Name -replace '.jpg$','.webp' }
```

### Linux/Mac:
```bash
cd public/players
for file in *.jpg; do 
    mv "$file" "${file%.jpg}.webp"
done
```

**Note**: This just renames the files. They're still JPG format internally but will work fine. For true WebP conversion, see the conversion guide below.

---

## Step 4: Convert to True WebP (Optional but Recommended)

For better compression and quality, convert JPG files to true WebP format:

### Using cwebp (Command Line Tool)

**Install cwebp:**
- **Windows**: Download from https://developers.google.com/speed/webp/download
- **macOS**: `brew install webp`
- **Linux**: `sudo apt-get install webp`

**Convert all files:**

```bash
cd public/players

# Batch convert all JPG files
for file in *.jpg; do 
    cwebp -q 85 "$file" -o "${file%.jpg}.webp"
    rm "$file"  # Remove original JPG after conversion
done
```

**Windows PowerShell:**
```powershell
cd public/players
Get-ChildItem *.jpg | ForEach-Object {
    $output = $_.Name -replace '.jpg$','.webp'
    & cwebp -q 85 $_.FullName -o $output
    Remove-Item $_.FullName
}
```

### Using Online Tools

1. Visit [Squoosh.app](https://squoosh.app)
2. Upload your JPG files
3. Select WebP format
4. Set quality to 85%
5. Download converted files
6. Replace files in `public/players/`

---

## Step 5: Clear Cache and Restart

```bash
# Clear Next.js image cache
rm -rf .next/cache/images

# Restart development server
npm run dev
```

---

## Verification Checklist

- [ ] SQL migration executed successfully
- [ ] Database records show `.webp` URLs (run verification query)
- [ ] Physical files renamed/converted to `.webp`
- [ ] Next.js cache cleared
- [ ] Dev server restarted
- [ ] Player pages display photos correctly
- [ ] No console errors about missing images

---

## Future Imports

✅ **Already Fixed!** All future imports will automatically use `.webp` format.

The following files have been updated:
- `app/api/import/confirm/route.ts` - Non-streaming import
- `app/api/import/stream/route.ts` - Streaming import with real-time progress

Both now save photo URLs as `/players/{playerId}.webp`

---

## Troubleshooting

### Photos not showing after migration?

1. **Check file extensions**: 
   ```bash
   ls public/players/ | head -10
   ```
   All files should end with `.webp`

2. **Check database URLs**:
   ```sql
   SELECT "photoUrl" FROM base_players LIMIT 5;
   ```
   All should end with `.webp`

3. **Clear browser cache**: Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Clear Next.js cache**:
   ```bash
   rm -rf .next/cache
   npm run dev
   ```

### Some photos still showing as .jpg?

Run the migration again - it's safe to run multiple times:
```bash
psql -U your_username -d your_database_name -f prisma/migrations/update_photo_urls_to_webp.sql
```

### Mixed file formats?

Ensure consistency:
```bash
# Check what formats exist
ls public/players/ | grep -E '\.(jpg|jpeg|png|webp)$' | sed 's/.*\.//' | sort | uniq -c
```

Convert all to WebP for consistency.

---

## Quick Fix Script (All-in-One)

Create `scripts/complete-photo-fix.sh`:

```bash
#!/bin/bash

echo "=== Photo URL Migration ==="

# 1. Update database
echo "Step 1: Updating database..."
psql -U $DB_USER -d $DB_NAME -f prisma/migrations/update_photo_urls_to_webp.sql

# 2. Rename files
echo "Step 2: Renaming photo files..."
cd public/players
for file in *.jpg; do 
    [ -f "$file" ] && mv "$file" "${file%.jpg}.webp"
done
cd ../..

# 3. Clear cache
echo "Step 3: Clearing cache..."
rm -rf .next/cache/images

echo "=== Migration Complete ==="
echo "Please restart your dev server: npm run dev"
```

Make executable and run:
```bash
chmod +x scripts/complete-photo-fix.sh
./scripts/complete-photo-fix.sh
```

---

## Need Help?

If you encounter issues:
1. Check the migration output for errors
2. Verify your database connection
3. Ensure you have write permissions for `public/players/`
4. Check the console for specific error messages
