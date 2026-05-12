# Players Page Troubleshooting Guide

## Problem: Public Players List Page Shows No Players

### Root Causes

The players page can be empty due to several reasons:

#### 1. **No Active Season** (Most Common)
The page queries for an active season using `isActive: true`. If no season is marked as active, the page returns empty.

**How to check:**
```bash
npx tsx scripts/diagnose-players-issue.ts
```

**How to fix:**
```bash
npx tsx scripts/fix-players-page.ts
```

Or manually in the database:
```sql
-- Check active seasons
SELECT id, name, "isActive" FROM seasons;

-- Set a season as active
UPDATE seasons SET "isActive" = true WHERE id = 'YOUR_SEASON_ID';

-- Ensure only one season is active
UPDATE seasons SET "isActive" = false WHERE id != 'YOUR_SEASON_ID';
```

#### 2. **No Seasonal Player Stats for Active Season**
Even with an active season, if there are no `seasonal_player_stats` records linked to that season, the page will be empty.

**How to check:**
```sql
-- Get active season ID
SELECT id, name FROM seasons WHERE "isActive" = true;

-- Check player stats for that season
SELECT COUNT(*) FROM seasonal_player_stats WHERE "seasonId" = 'YOUR_SEASON_ID';
```

**How to fix:**
- Import players for the active season using the admin import functionality
- Or link existing players to the season

#### 3. **Next.js Cache Issue**
The page might be serving a stale static version that was generated when there were no players.

**How to fix:**
```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
```

**Code fix applied:**
Added `export const dynamic = 'force-dynamic'` to force server-side rendering on every request.

#### 4. **Import Process Failed**
If the player import process was interrupted or failed, players might exist in `base_players` but not in `seasonal_player_stats`.

**How to check:**
```sql
-- Check base players
SELECT COUNT(*) FROM base_players;

-- Check seasonal stats
SELECT COUNT(*) FROM seasonal_player_stats;

-- Find orphaned base players (not linked to any season)
SELECT bp.id, bp.name 
FROM base_players bp
LEFT JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId"
WHERE sps.id IS NULL;
```

### Quick Diagnostic Commands

```bash
# Run diagnostic script
npx tsx scripts/diagnose-players-issue.ts

# Run auto-fix script
npx tsx scripts/fix-players-page.ts

# Clear cache and restart
rm -rf .next && npm run dev
```

### Code Changes Made

1. **Added dynamic rendering** to prevent caching:
   ```typescript
   export const dynamic = 'force-dynamic'
   ```

2. **Added console logging** for debugging:
   - Logs when no active season is found
   - Logs active season details
   - Logs player count for the season
   - Warns when no seasonal stats exist

### Prevention

To prevent this issue in the future:

1. **Always ensure one active season:**
   - When creating a new season, set it as active
   - When deactivating a season, activate another one

2. **Import players immediately after creating a season:**
   - Don't leave a season active without players
   - Use the admin import functionality

3. **Monitor the logs:**
   - Check server logs for warnings about missing active season
   - Check for warnings about empty seasonal stats

4. **Database constraints:**
   - Consider adding a database trigger to ensure at least one active season
   - Add monitoring for empty seasonal_player_stats tables

### Related Files

- Page: `app/(public)/players/page.tsx`
- Import Service: `lib/import-service.ts`
- Diagnostic Script: `scripts/diagnose-players-issue.ts`
- Fix Script: `scripts/fix-players-page.ts`

### Database Schema

```
seasons
├── id (PK)
├── name
└── isActive (boolean) ← Must be true for one season

base_players
├── id (PK)
└── name

seasonal_player_stats
├── id (PK)
├── basePlayerId (FK → base_players)
├── seasonId (FK → seasons) ← Must match active season
├── position
├── overallRating
└── ... other stats
```
