-- Add player_id column to base_players table
-- This column stores the eFootball database player ID for cross-season matching

ALTER TABLE base_players 
ADD COLUMN player_id VARCHAR(255);

-- Create unique index on player_id
CREATE UNIQUE INDEX base_players_player_id_key ON base_players(player_id);

-- Add comment
COMMENT ON COLUMN base_players.player_id IS 'eFootball database player ID - constant across seasons';
