-- ============================================
-- Simple Starred Players Debug
-- ============================================

-- STEP 1: Show ALL starred players in the system
SELECT 
  t.name as team_name,
  s.name as season_name,
  bp.name as player_name,
  sp."seasonTeamId",
  sp."playerId",
  sp.starred_at
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON sp."seasonId" = s.id
JOIN base_players bp ON sp."playerId" = bp.id
ORDER BY t.name, bp.name
LIMIT 50;

-- STEP 2: Count starred players per team
SELECT 
  t.name as team_name,
  s.name as season_name,
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
GROUP BY t.name, s.name
HAVING COUNT(sp.id) > 0
ORDER BY starred_count DESC;

-- STEP 3: Show all teams and their season_team_ids
SELECT 
  t.id as team_id,
  t.name as team_name,
  s.id as season_id,
  s.name as season_name,
  st.id as season_team_id
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
ORDER BY s.name, t.name;

-- STEP 4: Check the starred_players table structure
SELECT 
  COUNT(*) as total_starred_records,
  COUNT(DISTINCT "seasonTeamId") as unique_teams,
  COUNT(DISTINCT "playerId") as unique_players,
  COUNT(DISTINCT "seasonId") as unique_seasons
FROM starred_players;

-- STEP 5: Show sample starred_players records
SELECT * FROM starred_players LIMIT 10;
