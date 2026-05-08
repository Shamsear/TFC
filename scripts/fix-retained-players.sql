-- Script to create transfer_history entries for already retained players
-- This fixes the issue where retained players don't show up in team rosters

-- Insert transfer_history for retained players that don't have one yet
INSERT INTO transfer_history (id, "seasonId", "basePlayerId", "teamId", "soldPrice", "createdAt")
SELECT 
    'transfer-fix-' || r.id || '-' || EXTRACT(EPOCH FROM NOW())::text,
    r."seasonId",
    r."basePlayerId",
    th."teamId",
    th."soldPrice",
    NOW()
FROM retentions r
INNER JOIN transfer_history th 
    ON th."seasonId" = r."retainedFromSeasonId" 
    AND th."basePlayerId" = r."basePlayerId"
LEFT JOIN transfer_history existing 
    ON existing."seasonId" = r."seasonId" 
    AND existing."basePlayerId" = r."basePlayerId"
WHERE existing.id IS NULL;

-- Show results
SELECT 
    s.name as season,
    bp.name as player,
    t.name as team,
    th."soldPrice"
FROM transfer_history th
INNER JOIN base_players bp ON bp.id = th."basePlayerId"
INNER JOIN teams t ON t.id = th."teamId"
INNER JOIN seasons s ON s.id = th."seasonId"
WHERE th.id LIKE 'transfer-fix-%'
ORDER BY s.name, t.name, bp.name;
