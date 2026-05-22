-- ============================================
-- Quick Starred Players Check
-- ============================================
-- Simple queries to identify the cross-team visibility issue

-- 1. Show all starred players with their team information
SELECT 
  t.name as team_name,
  st.id as season_team_id,
  s.name as season_name,
  bp.name as player_name,
  sp."playerId",
  sp.starred_at
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON sp."seasonId" = s.id
JOIN base_players bp ON sp."playerId" = bp.id
ORDER BY s.name, t.name, bp.name;

-- 2. Count starred players per team per season
SELECT 
  t.name as team_name,
  s.name as season_name,
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
GROUP BY t.name, s.name
ORDER BY s.name, t.name;

-- 3. Check if any player is starred by multiple teams in the same season
SELECT 
  bp.name as player_name,
  sp."seasonId",
  s.name as season_name,
  COUNT(DISTINCT st."teamId") as teams_count,
  STRING_AGG(DISTINCT t.name, ', ') as team_names
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON sp."seasonId" = s.id
JOIN base_players bp ON sp."playerId" = bp.id
GROUP BY bp.name, sp."seasonId", s.name
HAVING COUNT(DISTINCT st."teamId") > 1
ORDER BY teams_count DESC;

-- 4. Verify season_teams uniqueness (should return no rows)
-- Each team should only appear once per season
SELECT 
  "seasonId",
  "teamId",
  COUNT(*) as duplicate_count
FROM season_teams
GROUP BY "seasonId", "teamId"
HAVING COUNT(*) > 1;

-- 5. Check for orphaned starred_players (should return no rows)
SELECT 
  sp.*
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
WHERE st.id IS NULL;
