-- ============================================
-- Verify TFCST-18 (FC Goa) Starred Players
-- ============================================

-- 1. Check how many starred players TFCST-18 actually has
SELECT 
  t.name as team_name,
  st.id as season_team_id,
  st."teamId",
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
WHERE st.id = 'TFCST-18'
  AND st."seasonId" = 'TFCS-4'
GROUP BY t.name, st.id, st."teamId";

-- 2. Show first 10 players that TFCST-18 has starred
SELECT 
  bp.id as player_id,
  bp.name as player_name,
  sp.starred_at
FROM starred_players sp
JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonTeamId" = 'TFCST-18'
  AND sp."seasonId" = 'TFCS-4'
ORDER BY sp.starred_at DESC
LIMIT 10;

-- 3. Check which team has these specific 53 players starred
-- (The ones you're seeing in the browser)
SELECT 
  t.name as team_name,
  st.id as season_team_id,
  st."teamId",
  COUNT(DISTINCT sp."playerId") as matching_players
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
WHERE sp."seasonId" = 'TFCS-4'
  AND sp."playerId" IN (
    'TFCP-188', 'TFCP-175', 'TFCP-313', 'TFCP-186', 'TFCP-345',
    'TFCP-190', 'TFCP-317', 'TFCP-348', 'TFCP-436', 'TFCP-831',
    'TFCP-612', 'TFCP-590', 'TFCP-980', 'TFCP-240', 'TFCP-529',
    'TFCP-397', 'TFCP-333', 'TFCP-310', 'TFCP-753', 'TFCP-582',
    'TFCP-15357', 'TFCP-30', 'TFCP-329', 'TFCP-270', 'TFCP-289',
    'TFCP-439', 'TFCP-539', 'TFCP-482', 'TFCP-664', 'TFCP-852',
    'TFCP-1521', 'TFCP-1606', 'TFCP-1735', 'TFCP-750', 'TFCP-531',
    'TFCP-1055', 'TFCP-1080', 'TFCP-1746', 'TFCP-38', 'TFCP-102',
    'TFCP-129', 'TFCP-1473', 'TFCP-988', 'TFCP-1692', 'TFCP-138',
    'TFCP-235', 'TFCP-374', 'TFCP-506', 'TFCP-33', 'TFCP-47',
    'TFCP-29', 'TFCP-92', 'TFCP-84'
  )
GROUP BY t.name, st.id, st."teamId"
ORDER BY matching_players DESC;

-- 4. Verify the session is correct - check what teamId TFCM-18 should have
SELECT 
  t.id as team_id,
  t.name as team_name,
  st.id as season_team_id,
  st."seasonId"
FROM teams t
JOIN season_teams st ON st."teamId" = t.id
WHERE t.id = 'TFCM-18'
  AND st."seasonId" = 'TFCS-4';
