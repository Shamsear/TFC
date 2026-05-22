-- Quick check for starred players issue
-- Check if seasonTeamId is being set correctly

-- 1. Show all starred_players with their team info for season TFCS-4
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  bp.name as player_name,
  st."teamId" as actual_team_id,
  t.name as team_name,
  t."managerName"
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
ORDER BY t.name, bp.name;

-- 2. Count starred players per team
SELECT 
  t.name as team_name,
  t.id as team_id,
  COUNT(sp.id) as starred_count
FROM teams t
JOIN season_teams st ON t.id = st."teamId"
LEFT JOIN starred_players sp ON st.id = sp."seasonTeamId" AND sp."seasonId" = 'TFCS-4'
WHERE st."seasonId" = 'TFCS-4'
GROUP BY t.name, t.id
ORDER BY starred_count DESC;

-- 3. Check for any orphaned starred_players (invalid seasonTeamId)
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId"
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
WHERE st.id IS NULL;
