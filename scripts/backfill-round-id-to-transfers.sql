-- Backfill round_id for existing transfer_history records
-- This attempts to match transfers to rounds based on:
-- 1. Season match
-- 2. Position match (if round has a position)
-- 3. Created timestamp near round completion

-- For transfers that match a specific position round
UPDATE transfer_history th
SET round_id = (
  SELECT r.id
  FROM rounds r
  INNER JOIN seasonal_player_stats sps ON sps.base_player_id = th.base_player_id AND sps.season_id = th.season_id
  WHERE r.season_id = th.season_id
    AND r.position = sps.position
    AND r.status = 'completed'
    AND th.created_at >= r.start_time
    AND th.created_at <= (r.end_time + INTERVAL '1 hour') -- Allow 1 hour after round end for finalization
  ORDER BY r.round_number DESC
  LIMIT 1
)
WHERE th.round_id IS NULL
  AND EXISTS (
    SELECT 1 FROM rounds r
    INNER JOIN seasonal_player_stats sps ON sps.base_player_id = th.base_player_id AND sps.season_id = th.season_id
    WHERE r.season_id = th.season_id
      AND r.position = sps.position
      AND r.status = 'completed'
  );

-- For transfers in rounds without specific position (fallback)
UPDATE transfer_history th
SET round_id = (
  SELECT r.id
  FROM rounds r
  WHERE r.season_id = th.season_id
    AND r.position IS NULL
    AND r.status = 'completed'
    AND th.created_at >= r.start_time
    AND th.created_at <= (r.end_time + INTERVAL '1 hour')
  ORDER BY r.round_number DESC
  LIMIT 1
)
WHERE th.round_id IS NULL
  AND EXISTS (
    SELECT 1 FROM rounds r
    WHERE r.season_id = th.season_id
      AND r.position IS NULL
      AND r.status = 'completed'
  );

-- Verify the update
SELECT 
  COUNT(*) as total_transfers,
  COUNT(round_id) as transfers_with_round,
  COUNT(*) - COUNT(round_id) as transfers_without_round
FROM transfer_history;

-- Show transfers by round
SELECT 
  r.id as round_id,
  r.round_number,
  r.position,
  COUNT(th.id) as transfer_count
FROM rounds r
LEFT JOIN transfer_history th ON th.round_id = r.id
WHERE r.status = 'completed'
GROUP BY r.id, r.round_number, r.position
ORDER BY r.round_number;
