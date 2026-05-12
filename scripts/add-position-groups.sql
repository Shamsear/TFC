-- Add position_group column to seasonal_player_stats
ALTER TABLE seasonal_player_stats 
ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B'));

-- Add index for faster queries
CREATE INDEX idx_seasonal_player_stats_position_group 
ON seasonal_player_stats(position, position_group);

-- Add position_group column to auction_slots
ALTER TABLE auction_slots 
ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));

-- Default to 'ALL' for existing slots
UPDATE auction_slots SET position_group = 'ALL' WHERE position_group IS NULL;

-- Add comment
COMMENT ON COLUMN seasonal_player_stats.position_group IS 'Position sub-group (A or B) for positions: CB, DMF, CMF, AMF, CF';
COMMENT ON COLUMN auction_slots.position_group IS 'Position sub-group filter for auction slots (A, B, or ALL)';
