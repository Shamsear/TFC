-- First, find Liverpool's team ID
SELECT id, name FROM teams WHERE name LIKE '%Liverpool%';

-- Find available LMF players
SELECT 
    bp.id as player_id,
    bp.name as player_name,
    sps."overallRating" as rating,
    sps.nationality
FROM base_players bp
INNER JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId"
WHERE sps.position = 'LMF'
  AND sps."seasonId" = 'TFCS-4'
  AND bp.id NOT IN (
    SELECT "basePlayerId" 
    FROM transfer_history 
    WHERE "seasonId" = 'TFCS-4'
  )
ORDER BY sps."overallRating" DESC
LIMIT 30;
