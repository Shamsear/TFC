-- ============================================
-- Find Starred Players Data
-- ============================================
-- This will help us understand what data exists

-- 1. Check if starred_players table has any data at all
SELECT 
  'Total starred_players records' as info,
  COUNT(*) as count
FROM starred_players;

-- 2. Show raw starred_players data (first 20 records)
SELECT 
  id,
  "seasonTeamId",
  "playerId", 
  "seasonId",
  starred_at
FROM starred_players
ORDER BY starred_at DESC
LIMIT 20;

-- 3. Find which teams have starred players (with raw IDs)
SELECT 
  sp."seasonTeamId",
  COUNT(*) as starred_count,
  MIN(sp.starred_at) as first_starred,
  MAX(sp.starred_at) as last_starred
FROM starred_players sp
GROUP BY sp."seasonTeamId"
ORDER BY starred_count DESC;

-- 4. Try to join and see if there's a data mismatch
SELECT 
  sp."seasonTeamId",
  st.id as season_team_id_from_table,
  st."teamId",
  st."seasonId",
  t.name as team_name,
  s.name as season_name,
  COUNT(sp.id) as starred_count
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
LEFT JOIN teams t ON st."teamId" = t.id
LEFT JOIN seasons s ON st."seasonId" = s.id
GROUP BY sp."seasonTeamId", st.id, st."teamId", st."seasonId", t.name, s.name
ORDER BY starred_count DESC;

-- 5. Check for orphaned records (starred_players with invalid seasonTeamId)
SELECT 
  sp.*
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
WHERE st.id IS NULL
LIMIT 10;

-- 6. Show all seasons
SELECT id, name, "startDate", "endDate" 
FROM seasons 
ORDER BY "startDate" DESC;

-- 7. Show all teams
SELECT id, name 
FROM teams 
ORDER BY name;
