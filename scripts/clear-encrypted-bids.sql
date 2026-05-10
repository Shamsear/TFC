-- Clear all encrypted bids due to encryption key change
-- Teams will need to re-enter their bids

DELETE FROM team_round_bids;

-- Verify deletion
SELECT COUNT(*) as remaining_bids FROM team_round_bids;
