# Starred Players Debug Issue

## Problem
User reports seeing starred players from other teams in the auction rounds page.

## Root Cause Analysis

The issue is in the API endpoint `/api/team/starred-players/route.ts`. The query filters by `seasonTeamId`, which should be unique per team per season. However, there might be:

1. **Session/Auth Issue**: The `session.user.teamId` might not be correctly identifying the current team
2. **Data Integrity Issue**: Multiple teams might share the same `seasonTeamId` 
3. **Query Logic Issue**: The filter might not be working as expected

## Diagnostic Queries

Run these queries to identify the issue:

```sql
-- Check if there are duplicate seasonTeamIds
SELECT "seasonTeamId", COUNT(*) as team_count
FROM season_teams
GROUP BY "seasonTeamId"
HAVING COUNT(*) > 1;

-- Check starred players and their associated teams
SELECT 
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId",
  st."teamId",
  t.name as team_name,
  bp.name as player_name
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN base_players bp ON sp."playerId" = bp.id
ORDER BY sp."seasonId", t.name, bp.name;

-- Check if a specific player is starred by multiple teams
SELECT 
  sp."playerId",
  bp.name as player_name,
  COUNT(DISTINCT sp."seasonTeamId") as teams_starred_by
FROM starred_players sp
JOIN base_players bp ON sp."playerId" = bp.id
GROUP BY sp."playerId", bp.name
HAVING COUNT(DISTINCT sp."seasonTeamId") > 1;
```

## Solution

The API logic looks correct. The issue is likely one of:

1. **Client-side caching**: The starred players list might be cached and not refreshing properly
2. **Race condition**: Multiple teams starring/unstarring at the same time
3. **Session issue**: The session might be returning the wrong teamId

## Fix

Add additional logging to the API to track what's happening:

```typescript
console.log('Session teamId:', session.user.teamId)
console.log('Season team found:', seasonTeam)
console.log('Starred players query result:', starredPlayers)
```

Also, ensure the client is properly refreshing the starred players list when the page loads.
