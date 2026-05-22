-- ============================================
-- Test Starred Players for Specific Team
-- ============================================
-- Replace the team name and season ID with your actual values

-- STEP 1: Find your team's season_team_id
SELECT 
  t.name as team_name,
  s.name as season_name,
  st.id as season_team_id,
  st."teamId",
  st."seasonId"
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
JOIN seasons s ON st."seasonId" = s.id
WHERE t.name = 'AC Milan'  -- REPLACE WITH YOUR TEAM NAME
  AND s.id = 'TFC-S1';     -- REPLACE WITH YOUR SEASON ID

-- STEP 2: Get all starred players for this team
-- Copy the season_team_id from STEP 1 and use it below
SELECT 
  bp.name as player_name,
  bp.id as player_id,
  sp."seasonTeamId",
  sp.starred_at
FROM starred_players sp
JOIN base_players bp ON sp."playerId" = bp.id
WHERE sp."seasonTeamId" = 'YOUR_SEASON_TEAM_ID_HERE'  -- REPLACE WITH VALUE FROM STEP 1
ORDER BY bp.name;

-- STEP 3: Verify this matches what the API returns
-- The player IDs from STEP 2 should match what you see in browser console:
-- [Client] Received starred players: [array of player IDs]

-- STEP 4: Check if any other team has the same starred players
-- This will show if the same players are starred by other teams (which is OK)
SELECT 
  bp.name as player_name,
  t.name as team_name,
  sp."seasonTeamId",
  sp.starred_at
FROM starred_players sp
JOIN base_players bp ON sp."playerId" = bp.id
JOIN season_teams st ON sp."seasonTeamId" = st.id
JOIN teams t ON st."teamId" = t.id
WHERE bp.id IN (
  -- Get player IDs from your team's starred players
  SELECT sp2."playerId"
  FROM starred_players sp2
  WHERE sp2."seasonTeamId" = 'YOUR_SEASON_TEAM_ID_HERE'  -- REPLACE WITH VALUE FROM STEP 1
)
AND sp."seasonId" = 'TFC-S1'  -- REPLACE WITH YOUR SEASON ID
ORDER BY bp.name, t.name;

-- STEP 5: Summary - Count starred players per team
SELECT 
  t.name as team_name,
  COUNT(sp.id) as starred_count
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
LEFT JOIN starred_players sp ON sp."seasonTeamId" = st.id
WHERE st."seasonId" = 'TFC-S1'  -- REPLACE WITH YOUR SEASON ID
GROUP BY t.name
ORDER BY starred_count DESC;
