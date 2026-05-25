-- Mark all bulk tiebreaker participants as submitted
-- This is for historical data where tiebreakers were resolved before the sealed bid migration

UPDATE bulk_tiebreaker_participants
SET 
  submitted = true,
  submitted_at = CURRENT_TIMESTAMP
WHERE submitted = false;

-- Verify the update
SELECT 
  bt.id as tiebreaker_id,
  bp.name as player_name,
  COUNT(*) as total_participants,
  SUM(CASE WHEN btp.submitted THEN 1 ELSE 0 END) as submitted_count
FROM bulk_tiebreakers bt
JOIN base_players bp ON bt.base_player_id = bp.id
JOIN bulk_tiebreaker_participants btp ON bt.id = btp.bulk_tiebreaker_id
GROUP BY bt.id, bp.name
ORDER BY bt.id;
