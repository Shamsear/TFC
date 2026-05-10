# Add SS Players - Instructions

## Problem
The script needs a valid DATABASE_URL to connect to your PostgreSQL database.

## Solution Options

### Option 1: Use SQL Script Directly (Recommended)

Run the SQL script `scripts/add-dummy-ss-players-fixed.sql` directly in your database client (pgAdmin, DBeaver, or psql).

**File:** `scripts/add-dummy-ss-players-fixed.sql`

This script will:
1. Find your active season automatically
2. Add 3 SS (Second Striker) players:
   - Marco Rossi (Italy, OVR 85)
   - Lucas Silva (Brazil, OVR 83)
   - Ahmed Hassan (Egypt, OVR 81)
3. Verify the insertion

### Option 2: Set DATABASE_URL and Run TypeScript Script

1. **Check your `.env` file** - Make sure DATABASE_URL is set:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

2. **Run the script:**
   ```bash
   npx tsx scripts/add-ss-players.ts
   ```

### Option 3: Manual SQL (Copy-Paste)

If you prefer to run SQL manually, here's the complete script:

```sql
-- Add 3 dummy SS (Second Striker) players for testing
DO $$
DECLARE
    active_season_id TEXT;
BEGIN
    -- Get the active season
    SELECT id INTO active_season_id
    FROM seasons
    WHERE "isActive" = true
    LIMIT 1;

    -- If no active season, raise error
    IF active_season_id IS NULL THEN
        RAISE EXCEPTION 'No active season found. Please activate a season first.';
    END IF;

    -- Player 1: Marco Rossi (Italian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_001',
        'Marco Rossi',
        'dummy_ss_001',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Player 2: Lucas Silva (Brazilian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_002',
        'Lucas Silva',
        'dummy_ss_002',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Player 3: Ahmed Hassan (Egyptian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_003',
        'Ahmed Hassan',
        'dummy_ss_003',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 1: Marco Rossi (Attacking SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical
    ) VALUES (
        'SPS_SS_001',
        'BP_SS_001',
        active_season_id,
        'SS',
        85,
        'Italy',
        'Free Agent',
        82,
        88,
        84,
        86,
        45,
        75
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 2: Lucas Silva (Creative SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical
    ) VALUES (
        'SPS_SS_002',
        'BP_SS_002',
        active_season_id,
        'SS',
        83,
        'Brazil',
        'Free Agent',
        85,
        82,
        88,
        89,
        40,
        70
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 3: Ahmed Hassan (Physical SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        pace,
        shooting,
        passing,
        dribbling,
        defending,
        physical
    ) VALUES (
        'SPS_SS_003',
        'BP_SS_003',
        active_season_id,
        'SS',
        81,
        'Egypt',
        'Free Agent',
        80,
        84,
        78,
        80,
        48,
        82
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Successfully added 3 SS players to season: %', active_season_id;
END $$;

-- Verify the insertion
SELECT 
    bp.id,
    bp.name,
    sps.position,
    sps."overallRating" as overall,
    sps.nationality,
    s.name as season_name
FROM base_players bp
JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId"
JOIN seasons s ON sps."seasonId" = s.id
WHERE bp.id IN ('BP_SS_001', 'BP_SS_002', 'BP_SS_003')
ORDER BY sps."overallRating" DESC;
```

## What Gets Added

### Players:
1. **Marco Rossi** (Italy)
   - Position: SS (Second Striker)
   - Overall: 85
   - Style: Attacking (High shooting: 88, Good dribbling: 86)

2. **Lucas Silva** (Brazil)
   - Position: SS
   - Overall: 83
   - Style: Creative (High passing: 88, Excellent dribbling: 89)

3. **Ahmed Hassan** (Egypt)
   - Position: SS
   - Overall: 81
   - Style: Physical (High physical: 82, Good shooting: 84)

## Verification

After running the script, you should see output like:
```
NOTICE:  Successfully added 3 SS players to season: TFCS-4

 id        | name          | position | overall | nationality | season_name
-----------+---------------+----------+---------+-------------+-------------
 BP_SS_001 | Marco Rossi   | SS       | 85      | Italy       | Season 4
 BP_SS_002 | Lucas Silva   | SS       | 83      | Brazil      | Season 4
 BP_SS_003 | Ahmed Hassan  | SS       | 81      | Egypt       | Season 4
```

## Notes

- The script uses `ON CONFLICT DO NOTHING` so it's safe to run multiple times
- Players are added to the currently active season
- If no active season exists, the script will fail with an error message
- All required fields are included (createdAt, updatedAt, etc.)
