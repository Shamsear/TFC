# SQL Error Fix: Column "seasonTeamId" Does Not Exist

## The Error

```
ERROR: column "seasonTeamId" does not exist (SQLSTATE 42703)
```

## Root Cause

The query you ran was trying to select `"seasonTeamId"` from the `season_teams` table:

```sql
SELECT    
  "seasonTeamId",   
  COUNT(*) as team_count,   
  STRING_AGG("teamId", ', ') as team_ids 
FROM season_teams 
GROUP BY "seasonTeamId" 
HAVING COUNT(*) > 1
```

**The problem**: The `season_teams` table doesn't have a column called `"seasonTeamId"`. 

## Understanding the Schema

Here's how the tables are structured:

### `season_teams` table
- `id` - Primary key (this is what gets referenced as `seasonTeamId` in other tables)
- `teamId` - Foreign key to `teams` table
- `seasonId` - Foreign key to `seasons` table
- Other columns...

### `starred_players` table
- `id` - Primary key
- `seasonTeamId` - Foreign key to `season_teams.id`
- `playerId` - Foreign key to `base_players.id`
- `seasonId` - Foreign key to `seasons.id`
- `starred_at` - Timestamp

## Corrected Query

If you wanted to check for duplicate season-team combinations (which shouldn't exist due to unique constraints), use this:

```sql
-- Check for duplicate season-team combinations
SELECT    
  "seasonId",
  "teamId",
  COUNT(*) as duplicate_count
FROM season_teams 
GROUP BY "seasonId", "teamId"
HAVING COUNT(*) > 1;
```

This query should return **no rows** if the data is correct, because each team should only appear once per season.

## Verification Queries

### 1. Check if starred players are properly segregated by team

```sql
-- Show starred players count per team
SELECT 
  t.name as team_name,
  s.name as season_name,
  st.id as season_team_id,
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
GROUP BY t.name, s.name, st.id
ORDER BY s.name, t.name;
```

### 2. Check if any player is starred by multiple teams (this is EXPECTED and OK)

```sql
-- Players starred by multiple teams (this is normal behavior)
SELECT 
  bp.name as player_name,
  s.name as season_name,
  COUNT(DISTINCT st."teamId") as teams_count,
  STRING_AGG(DISTINCT t.name, ', ') as team_names
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON sp."seasonId" = s.id
JOIN base_players bp ON sp."playerId" = bp.id
GROUP BY bp.name, s.name
HAVING COUNT(DISTINCT st."teamId") > 1
ORDER BY teams_count DESC
LIMIT 20;
```

### 3. Verify the API is filtering correctly

```sql
-- For a specific team, show their starred players
-- Replace 'AC Milan' with the team name you're testing
SELECT 
  t.name as team_name,
  bp.name as player_name,
  sp."playerId",
  sp."seasonTeamId",
  st.id as season_team_id_from_join
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN base_players bp ON sp."playerId" = bp.id
WHERE t.name = 'AC Milan'
  AND sp."seasonId" = 'TFC-S1'  -- Replace with your season ID
ORDER BY bp.name;
```

## What to Check Next

1. **Run the corrected queries above** to verify data integrity
2. **Check browser console** when you're on the auction page - look for:
   - `[Client] Loading starred players for season:`
   - `[Client] Received starred players:` - note the player IDs
3. **Check server logs** - look for:
   - `[Starred Players GET] Session teamId:`
   - `[Starred Players GET] Season team ID:`
   - `[Starred Players GET] Found X starred players`

## Expected Results

- Each team should have their own unique `seasonTeamId` (which is `season_teams.id`)
- The API should only return starred players where `starred_players.seasonTeamId` matches the current team's `season_teams.id`
- Multiple teams CAN star the same player - this is expected and correct behavior
- When you see a starred player, it means YOUR team starred them, not that you're seeing another team's stars

## Still Seeing the Issue?

If after running these queries you still see starred players from other teams, please provide:

1. The output of query #1 (starred players count per team)
2. The browser console logs showing the player IDs received
3. The server logs showing the `teamId` and `seasonTeamId`
4. The specific player names you believe are from another team

This will help identify if it's a data issue, session issue, or UI confusion.
