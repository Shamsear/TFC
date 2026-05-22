-- ============================================
-- Diagnose Starred Players Issue
-- ============================================
-- This script helps identify why starred players from other teams
-- might be showing up for a user

-- ============================================
-- 1. Check for duplicate season_teams.id values
-- ============================================
SELECT 
  id,
  COUNT(*) as duplicate_count
FROM season_teams
GROUP BY id
HAVING COUNT(*) > 1;

-- ============================================
-- 1b. View season_teams structure
-- ============================================
SELECT 
  st.id as season_team_id,
  st."teamId",
  t.name as team_name,
  st."seasonId",
  s.name as season_name
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
ORDER BY s.name, t.name;

-- ============================================
-- 2. View all starred players with team info
-- ============================================
SELECT 
  sp.id as starred_id,
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId",
  st."teamId",
  t.name as team_name,
  bp.name as player_name,
  s.name as season_name,
  sp.starred_at
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN base_players bp ON sp."playerId" = bp.id
JOIN seasons s ON sp."seasonId" = s.id
ORDER BY sp."seasonId", t.name, bp.name;

-- ============================================
-- 3. Check if any player is starred by multiple teams
-- ============================================
SELECT 
  sp."playerId",
  bp.name as player_name,
  sp."seasonId",
  s.name as season_name,
  COUNT(DISTINCT sp."seasonTeamId") as teams_starred_by,
  STRING_AGG(DISTINCT t.name, ', ') as team_names
FROM starred_players sp
JOIN base_players bp ON sp."playerId" = bp.id
JOIN seasons s ON sp."seasonId" = s.id
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
GROUP BY sp."playerId", bp.name, sp."seasonId", s.name
HAVING COUNT(DISTINCT sp."seasonTeamId") > 1
ORDER BY teams_starred_by DESC;

-- ============================================
-- 4. Check season_teams table structure
-- ============================================
SELECT 
  st.id as season_team_id,
  st."teamId",
  t.name as team_name,
  st."seasonId",
  s.name as season_name,
  COUNT(sp.id) as starred_players_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
GROUP BY st.id, st."teamId", t.name, st."seasonId", s.name
ORDER BY st."seasonId", t.name;

-- ============================================
-- 5. Check for orphaned starred_players records
-- ============================================
SELECT 
  sp.*
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
WHERE st.id IS NULL;

-- ============================================
-- 6. Verify unique constraint is working
-- ============================================
SELECT 
  "seasonTeamId",
  "playerId",
  "seasonId",
  COUNT(*) as duplicate_count
FROM starred_players
GROUP BY "seasonTeamId", "playerId", "seasonId"
HAVING COUNT(*) > 1;

-- ============================================
-- EXAMPLE: Get starred players for a specific team
-- ============================================
-- Replace 'TEAM_ID_HERE' and 'SEASON_ID_HERE' with actual values
/*
SELECT 
  sp."playerId",
  bp.name as player_name
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN base_players bp ON sp."playerId" = bp.id
WHERE st."teamId" = 'TEAM_ID_HERE'
  AND sp."seasonId" = 'SEASON_ID_HERE';
*/
