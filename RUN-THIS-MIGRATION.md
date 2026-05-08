# Database Migration Required

## Error
The database is missing the new tournament configuration columns:
- `leagueLegs`
- `playoffFormat`
- `groupLegs`
- `groupQualifiers`
- `knockoutConfig`

And the new tables:
- `knockout_rounds`
- `knockout_pairings`

## Solution

You need to run the migration SQL in your Neon database console.

### Steps:

1. **Go to Neon Console**: https://console.neon.tech/
2. **Select your project**: turfcats
3. **Go to SQL Editor**
4. **Copy and paste the entire content** from `prisma/migrations/add_tournaments_fixtures.sql`
5. **Click "Run"**

### What the migration does:
- Creates enum types for tournament/match/round status
- Creates `tournaments` table with advanced configuration columns
- Creates `knockout_rounds` table for managing knockout stages
- Creates `knockout_pairings` table for team matchups
- Creates `groups` table for group stage tournaments
- Creates `matches` table for all match data
- Creates `standings` table with relation to season_teams
- Adds all necessary foreign keys and unique constraints

### Important Notes:
- If the tables already exist, the migration will skip creating them (uses `CREATE TABLE IF NOT EXISTS` for some, but Postgres enums need to be created first)
- If you get errors about existing types/tables, you may need to:
  1. Drop the existing `tournaments` table first: `DROP TABLE IF EXISTS tournaments CASCADE;`
  2. Then run the full migration

### Alternative: Add columns to existing table

If the `tournaments` table already exists without the new columns, run this instead:

```sql
-- Add new columns to existing tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS "leagueLegs" INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS "playoffFormat" TEXT,
ADD COLUMN IF NOT EXISTS "groupLegs" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "groupQualifiers" INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS "knockoutConfig" TEXT;

-- Create knockout_rounds table if it doesn't exist
CREATE TABLE IF NOT EXISTS "knockout_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "legs" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knockout_rounds_pkey" PRIMARY KEY ("id")
);

-- Create knockout_pairings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "knockout_pairings" (
    "id" TEXT NOT NULL,
    "knockoutRoundId" TEXT NOT NULL,
    "team1Id" TEXT,
    "team2Id" TEXT,
    "winnerId" TEXT,
    "leg1MatchId" TEXT,
    "leg2MatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knockout_pairings_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "knockout_rounds" 
ADD CONSTRAINT "knockout_rounds_tournamentId_fkey" 
FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knockout_pairings" 
ADD CONSTRAINT "knockout_pairings_knockoutRoundId_fkey" 
FOREIGN KEY ("knockoutRoundId") REFERENCES "knockout_rounds"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "knockout_rounds_tournamentId_roundName_key" 
ON "knockout_rounds"("tournamentId", "roundName");

-- Add standings foreign key to season_teams
ALTER TABLE "standings" 
ADD CONSTRAINT "standings_teamId_fkey" 
FOREIGN KEY ("teamId") REFERENCES "season_teams"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;
```

### After running the migration:
1. Restart your Next.js dev server
2. The error should be resolved
3. You can now create tournaments with advanced configuration
