-- Add normalized_name column to base_players for accent-insensitive search
-- This allows searching "vinicius junior" to find "Vinícius Júnior"

ALTER TABLE base_players ADD COLUMN normalized_name TEXT;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_base_players_normalized_name ON base_players(normalized_name);
