-- Find available LMF players not currently in any team for the current season
SELECT 
    bp.id,
    bp.name,
    bp.player_id,
    sps.position,
    sps."overallRating",
    sps.nationality
FROM base_players bp
INNER JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId"
WHERE sps.position = 'LMF'
  AND sps."seasonId" = 'TFCS-4'  -- Current season
  AND bp.id NOT IN (
    SELECT "basePlayerId" 
    FROM transfer_history 
    WHERE "seasonId" = 'TFCS-4'
  )
ORDER BY sps."overallRating" DESC
LIMIT 50;
