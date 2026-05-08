# Tournament Teams Migration - FIXED

## What This Does

This migration creates the `tournament_teams` table and migrates existing tournament-team relationships from matches.

## Fixed Issues

1. **Column Name Mismatch**: PostgreSQL uses camelCase column names (e.g., `tournamentId`, `homeTeamId`) but the migration was using snake_case. Fixed by using proper quoted column names.

2. **SQL Syntax**: Updated the INSERT query to properly handle the UNION and column references.

## How to Run

### Option 1: Direct SQL (Recommended)

```bash
# Connect to your PostgreSQL database and run:
psql -U your_username -d your_database -f prisma/migrations/add_tournament_teams.sql
```

### Option 2: Using psql command line

```bash
psql -U your_username -d your_database
\i prisma/migrations/add_tournament_teams.sql
```

### Option 3: Copy-paste into database client

Open your PostgreSQL client (pgAdmin, DBeaver, etc.) and execute the contents of `prisma/migrations/add_tournament_teams.sql`

## Verification

After running the migration, verify it worked:

```sql
-- Check if table was created
SELECT COUNT(*) FROM tournament_teams;

-- Check if data was migrated
SELECT tt.*, t.name as tournament_name, st.id as season_team_id
FROM tournament_teams tt
JOIN tournaments t ON t.id = tt.tournament_id
JOIN season_teams st ON st.id = tt.team_id
LIMIT 10;
```

## What Gets Migrated

- All unique tournament-team pairs from existing matches
- Group assignments for GROUP_KNOCKOUT tournaments
- Proper foreign key relationships to tournaments and season_teams

## Next Steps

After successful migration:
1. The standings page will work correctly
2. Tournament teams will be properly tracked
3. You can add teams to tournaments before creating matches
