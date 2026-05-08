# Quick Fix: Player Photos (.jpg → .webp)

## Problem
Database has `.jpg` URLs but system now uses `.webp`

## Solution (3 Steps)

### 1️⃣ Fix Database
```bash
node scripts/fix-photo-urls.js
```

### 2️⃣ Rename Files

**Windows:**
```powershell
cd public/players
Get-ChildItem *.jpg | Rename-Item -NewName { $_.Name -replace '.jpg$','.webp' }
```

**Mac/Linux:**
```bash
cd public/players
for file in *.jpg; do mv "$file" "${file%.jpg}.webp"; done
```

### 3️⃣ Restart
```bash
rm -rf .next/cache/images
npm run dev
```

## Verify
```sql
-- Should show 0 jpg_count
SELECT 
    COUNT(CASE WHEN "photoUrl" LIKE '%.jpg' THEN 1 END) as jpg_count,
    COUNT(CASE WHEN "photoUrl" LIKE '%.webp' THEN 1 END) as webp_count
FROM base_players;
```

## Done! ✅
- Future imports automatically use `.webp`
- All existing records updated
- All files renamed
- Photos display correctly

---

**Need details?** See `PHOTO-URL-FIX-SUMMARY.md`
