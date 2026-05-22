-- ============================================
-- Check Which Team Has These 53 Starred Players
-- ============================================

-- Check which team has exactly 53 starred players in season TFCS-4
SELECT 
  t.name as team_name,
  st.id as season_team_id,
  st."teamId",
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
WHERE st."seasonId" = 'TFCS-4'
GROUP BY t.name, st.id, st."teamId"
HAVING COUNT(sp.id) = 53
ORDER BY t.name;

-- Show the first 10 players from the team with 53 starred players
SELECT 
  t.name as team_name,
  bp.name as player_name,
  bp.id as player_id,
  sp."seasonTeamId"
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
  AND sp."playerId" IN ('TFCP-188', 'TFCP-175', 'TFCP-313', 'TFCP-186', 'TFCP-345', 'TFCP-190', 'TFCP-317', 'TFCP-348', 'TFCP-436', 'TFCP-831')
ORDER BY t.name, bp.name;

-- Check if multiple teams have these same players starred
SELECT 
  bp.id as player_id,
  bp.name as player_name,
  COUNT(DISTINCT st."teamId") as teams_count,
  STRING_AGG(DISTINCT t.name, ', ') as team_names
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
  AND sp."playerId" IN ('TFCP-188', 'TFCP-175', 'TFCP-313', 'TFCP-186', 'TFCP-345')
GROUP BY bp.id, bp.name
ORDER BY teams_count DESC;

-- Show ALL teams and their starred player counts for TFCS-4
SELECT 
  t.name as team_name,
  st.id as season_team_id,
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id AND sp."seasonId" = 'TFCS-4'
WHERE st."seasonId" = 'TFCS-4'
GROUP BY t.name, st.id
ORDER BY starred_count DESC;
