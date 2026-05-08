# Run This Migration for eFootball Import System

## ⚠️ IMPORTANT: Run this migration before using the import system

The eFootball import system requires additional columns in the `seasonal_player_stats` table to store detailed player statistics.

## Step 1: Run the Migration

### Option A: Using psql (Recommended)
```bash
psql $DATABASE_URL -f prisma/migrations/add_detailed_player_stats.sql
```

### Option B: Using Database Client
1. Open your database client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open the file: `prisma/migrations/add_detailed_player_stats.sql`
4. Copy the entire SQL content
5. Execute it in your database

### Option C: Direct SQL (if you have connection issues)
```bash
# Replace with your actual connection string
psql "postgresql://user:password@host:5432/database" -f prisma/migrations/add_detailed_player_stats.sql
```

## Step 2: Regenerate Prisma Client
```bash
npx prisma generate
```

## Step 3: Restart Your Development Server
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Verify Migration Success

### Check in Database
Run this query to verify columns were added:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seasonal_player_stats' 
AND column_name IN ('nationality', 'playing_style', 'offensive_awareness');
```

You should see 3 rows returned.

### Check in Application
1. Navigate to `/sub-admin/import`
2. If the page loads without errors, migration was successful
3. Try uploading a database file to test

## What This Migration Adds

The migration adds 27 new columns to `seasonal_player_stats`:

**Player Info (2 columns):**
- nationality
- playing_style

**Offensive Stats (10 columns):**
- offensive_awareness
- ball_control
- dribbling
- tight_possession
- low_pass
- lofted_pass
- finishing
- heading
- set_piece_taking
- curl

**Physical Stats (7 columns):**
- speed
- acceleration
- kicking_power
- jumping
- physical_contact
- balance
- stamina

**Defensive Stats (4 columns):**
- defensive_awareness
- tackling
- aggression
- defensive_engagement

**Goalkeeper Stats (5 columns):**
- gk_awareness
- gk_catching
- gk_parrying
- gk_reflexes
- gk_reach

## Troubleshooting

### Error: "column already exists"
The migration has already been run. You can skip this step.

### Error: "relation does not exist"
Make sure you're connected to the correct database and that the `seasonal_player_stats` table exists.

### Error: "permission denied"
Your database user needs ALTER TABLE permissions. Contact your database administrator.

### Prisma Generate Fails
1. Make sure the migration completed successfully
2. Check that `prisma/schema.prisma` has the updated model
3. Try: `npx prisma generate --force`

## Rollback (if needed)

If you need to remove these columns:
```sql
ALTER TABLE seasonal_player_stats
DROP COLUMN IF EXISTS nationality,
DROP COLUMN IF EXISTS playing_style,
DROP COLUMN IF EXISTS offensive_awareness,
DROP COLUMN IF EXISTS ball_control,
DROP COLUMN IF EXISTS dribbling,
DROP COLUMN IF EXISTS tight_possession,
DROP COLUMN IF EXISTS low_pass,
DROP COLUMN IF EXISTS lofted_pass,
DROP COLUMN IF EXISTS finishing,
DROP COLUMN IF EXISTS heading,
DROP COLUMN IF EXISTS set_piece_taking,
DROP COLUMN IF EXISTS curl,
DROP COLUMN IF EXISTS speed,
DROP COLUMN IF EXISTS acceleration,
DROP COLUMN IF EXISTS kicking_power,
DROP COLUMN IF EXISTS jumping,
DROP COLUMN IF EXISTS physical_contact,
DROP COLUMN IF EXISTS balance,
DROP COLUMN IF EXISTS stamina,
DROP COLUMN IF EXISTS defensive_awareness,
DROP COLUMN IF EXISTS tackling,
DROP COLUMN IF EXISTS aggression,
DROP COLUMN IF EXISTS defensive_engagement,
DROP COLUMN IF EXISTS gk_awareness,
DROP COLUMN IF EXISTS gk_catching,
DROP COLUMN IF EXISTS gk_parrying,
DROP COLUMN IF EXISTS gk_reflexes,
DROP COLUMN IF EXISTS gk_reach;
```

## Next Steps

After successful migration:
1. Read `EFOOTBALL-IMPORT-INSTRUCTIONS.md` for usage guide
2. Place player images in `/public/players/` directory
3. Test import with `efootball_latest.db`
4. Review `IMPORT-SYSTEM-COMPLETE.md` for full details

---

**Migration File:** `prisma/migrations/add_detailed_player_stats.sql`
**Schema File:** `prisma/schema.prisma`
**Status:** Ready to run
