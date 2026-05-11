-- Update specific transfer records with acquisition details

-- Update the first player (won normally)
UPDATE transfer_history
SET 
  acquisition_type = 'bid_won',
  acquisition_notes = 'Won with highest bid of £53'
WHERE id = 'SSPSLTH1778440201886cto46fp7d';

-- Update the second player (auto-assigned)
UPDATE transfer_history
SET 
  acquisition_type = 'auto_assigned',
  acquisition_notes = 'Auto-assigned (team did not submit bids). Price averaged from 1 winning bid(s) at £53'
WHERE id = 'SSPSLTH1778440201886dwn79cveg';

-- Verify the updates
SELECT 
  id,
  "basePlayerId",
  "teamId",
  "soldPrice",
  acquisition_type,
  acquisition_notes
FROM transfer_history
WHERE id IN ('SSPSLTH1778440201886cto46fp7d', 'SSPSLTH1778440201886dwn79cveg');

-- Update all other existing transfers without acquisition_type to 'bid_won'
UPDATE transfer_history
SET 
  acquisition_type = 'bid_won',
  acquisition_notes = CASE 
    WHEN acquisition_notes IS NULL THEN 'Won with highest bid of £' || "soldPrice"
    ELSE acquisition_notes
  END
WHERE acquisition_type IS NULL OR acquisition_type = '';

-- Show summary of acquisition types
SELECT 
  acquisition_type,
  COUNT(*) as count,
  SUM("soldPrice") as total_spent
FROM transfer_history
GROUP BY acquisition_type
ORDER BY count DESC;
