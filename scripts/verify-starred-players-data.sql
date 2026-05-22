-- ============================================
-- Verify Starred Players Data Integrity
-- ============================================

-- 1. Check if season_teams.id is truly unique
SELECT 
  id,
  COUNT(*) as count
FROM season_teams
GROUP BY id
HAVING COUNT(*) > 1;

-- 2. Verify the relationship between teams and season_teams
SELECT 
  t.id as team_id,
  t.name as team_name,
  st.id as season_team_id,
  st."seasonId",
  s.name as season_name
FROM teams t
JOIN season_teams st ON t.id = st."teamId"
JOIN seasons s ON st."seasonId" = s.id
ORDER BY t.name, s.name;

-- 3. Check starred_players and verify they're correctly linked
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId",
  st."teamId",
  t.name as team_name,
  bp.name as player_name,
  s.name as season_name
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
LEFT JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
LEFT JOIN seasons s ON sp."seasonId" = s.id
ORDER BY t.name, bp.name;

-- 4. Find any starred_players records with invalid seasonTeamId
SELECT 
  sp.*
FROM starred_players sp
WHERE NOT EXISTS (
  SELECT 1 FROM season_teams st WHERE st.id = sp."seasonTeamId"
);

-- 5. Check if any team has starred the same player multiple times
SELECT 
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId",
  COUNT(*) as duplicate_count
FROM starred_players sp
GROUP BY sp."seasonTeamId", sp."playerId", sp."seasonId"
HAVING COUNT(*) > 1;

-- 6. Get a sample query showing what the API should return for a specific team
-- (Replace TEAM_ID and SEASON_ID with actual values)
/*
WITH team_season AS (
  SELECT id as season_team_id
  FROM season_teams
  WHERE "teamId" = 'TEAM_ID'
    AND "seasonId" = 'SEASON_ID'
)
SELECT 
  sp."playerId",
  bp.name as player_name
FROM starred_players sp
JOIN team_season ts ON sp."seasonTeamId" = ts.season_team_id
JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'SEASON_ID';
*/
