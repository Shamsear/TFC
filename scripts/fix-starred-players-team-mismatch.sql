-- Fix starred_players records that have incorrect seasonTeamId
-- This can happen if data was migrated incorrectly or if there was a bug

-- STEP 1: Identify the problem
-- Show starred_players that might have wrong seasonTeamId
SELECT 
  sp.id,
  sp."seasonTeamId" as current_season_team_id,
  sp."playerId",
  sp."seasonId",
  bp.name as player_name,
  st."teamId" as current_team_id,
  t.name as current_team_name
FROM starred_players sp
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
LEFT JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonId" = 'TFCS-4'
ORDER BY t.name, bp.name;

-- STEP 2: Check if there are any orphaned records (seasonTeamId doesn't exist)
SELECT 
  sp.id,
  sp."seasonTeamId",
  sp."playerId",
  sp."seasonId"
FROM starred_players sp
LEFT JOIN season_teams st ON sp."seasonTeamId" = st.id
WHERE st.id IS NULL;

-- STEP 3: If you find orphaned records, delete them
-- DELETE FROM starred_players
-- WHERE "seasonTeamId" NOT IN (SELECT id FROM season_teams);

-- STEP 4: Verify the fix
-- SELECT 
--   t.name as team_name,
--   COUNT(sp.id) as starred_count
-- FROM teams t
-- JOIN season_teams st ON t.id = st."teamId"
-- LEFT JOIN starred_players sp ON st.id = sp."seasonTeamId" AND sp."seasonId" = 'TFCS-4'
-- WHERE st."seasonId" = 'TFCS-4'
-- GROUP BY t.name
-- ORDER BY starred_count DESC;
