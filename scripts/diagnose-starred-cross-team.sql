-- Diagnose starred players showing across teams
-- This checks if there are any starred_players records with incorrect seasonTeamId

-- 1. Check if there are any starred_players with invalid seasonTeamId
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId",
  st.id as actual_season_team_id,
  st."teamId",
  t.name as team_name,
  bp.name as player_name
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
LEFT JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
ORDER BY sp."seasonTeamId", sp."playerId";

-- 2. Check for duplicate starred_players (same player starred by multiple teams)
SELECT 
  sp."playerId",
  bp.name as player_name,
  COUNT(DISTINCT sp."seasonTeamId") as team_count,
  STRING_AGG(DISTINCT t.name, ', ') as teams
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
GROUP BY sp."playerId", bp.name
HAVING COUNT(DISTINCT sp."seasonTeamId") > 1
ORDER BY team_count DESC;

-- 3. Check specific round TFCR-4 to see what's happening
SELECT 
  r.id as round_id,
  r."seasonId",
  r.position,
  r.position_group
FROM rounds r
WHERE r.id = 'TFCR-4';

-- 4. Get all starred players for a specific team (replace TFCM-24 with actual team)
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  bp.name as player_name,
  st."teamId",
  t.name as team_name
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
WHERE st."teamId" = 'TFCM-24' AND sp."seasonId" = 'TFCS-4';
