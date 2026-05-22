# Starred Players Cross-Team Visibility Fix

## Issue
Users are seeing starred players from other teams in the auction rounds page at `/team/auction/rounds/[id]`.

## Investigation Steps

### 1. Check Server Logs
The API now includes detailed logging. Check your server console for:
- `[Starred Players GET]` - Shows which team is requesting starred players
- `[Starred Players POST]` - Shows which team is starring a player
- `[Starred Players DELETE]` - Shows which team is unstarring a player

### 2. Check Browser Console
The client now includes logging. Open browser DevTools and check for:
- `[Client] Loading starred players for season:` - Shows when starred players are loaded
- `[Client] Received starred players:` - Shows the player IDs returned from API
- `[Client] Toggling star for player:` - Shows when a star is toggled
- `[Client] Player currently starred:` - Shows the current state

### 3. Run Diagnostic SQL
Execute the queries in `scripts/diagnose-starred-players.sql` to check:
- If there are duplicate `seasonTeamId` values
- If players are starred by multiple teams
- If there are orphaned records
- The overall data integrity

## Possible Root Causes

### 1. Session/Authentication Issue
**Symptom**: The API logs show different `teamId` values than expected
**Fix**: Check the authentication middleware and session management

### 2. Data Integrity Issue
**Symptom**: The diagnostic SQL shows duplicate `seasonTeamId` or players starred by multiple teams
**Fix**: Clean up the data and ensure proper constraints

### 3. Client-Side Caching
**Symptom**: The browser console shows old/stale starred player IDs
**Fix**: Clear browser cache or add cache-busting to the API call

### 4. Race Condition
**Symptom**: Starred players appear/disappear randomly
**Fix**: Add proper locking or optimistic concurrency control

## Verification Steps

1. **Login as Team A**
   - Star a few players
   - Note the player IDs in browser console
   - Check server logs for the `seasonTeamId`

2. **Login as Team B** (different browser/incognito)
   - Check if Team A's starred players appear
   - Star different players
   - Note the player IDs

3. **Compare the logs**
   - Both teams should have different `seasonTeamId` values
   - The `starredPlayerIds` arrays should be completely different

4. **Run SQL verification**
   ```sql
   -- Check if the starred players are correctly associated
   SELECT 
     sp."seasonTeamId",
     st."teamId",
     t.name as team_name,
     COUNT(*) as starred_count
   FROM starred_players sp
   JOIN season_teams st ON sp."seasonTeamId" = st.id
   JOIN teams t ON st."teamId" = t.id
   GROUP BY sp."seasonTeamId", st."teamId", t.name;
   ```

## Expected Behavior

- Each team should only see their own starred players
- The API should filter by `seasonTeamId` which is unique per team per season
- Starring/unstarring should only affect the current team's records

## Next Steps

1. Check the logs (server and browser console)
2. Run the diagnostic SQL queries
3. Report back with:
   - The `teamId` from server logs
   - The `seasonTeamId` from server logs
   - The player IDs being returned
   - Any SQL query results showing data issues

## Temporary Workaround

If the issue persists, you can add an additional filter in the client:

```typescript
// In NormalRoundBiddingClient.tsx, after loading starred players
useEffect(() => {
  fetch(`/api/team/starred-players?seasonId=${round.season.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.starredPlayerIds) {
        // Additional verification: only include players that exist in current round
        const validPlayerIds = data.starredPlayerIds.filter((id: string) => 
          players.some(p => p.basePlayer.id === id)
        )
        setStarredPlayerIds(new Set(validPlayerIds))
      }
    })
    .catch(err => console.error('Error loading starred players:', err))
}, [round.season.id, players])
```

This ensures only players available in the current round are shown as starred.
