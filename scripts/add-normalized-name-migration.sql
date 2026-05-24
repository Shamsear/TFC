-- Safe migration: Add normalized_name column to base_players
-- This only adds a new column, no data loss

-- Add the column (nullable initially)
ALTER TABLE base_players ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS idx_base_players_normalized_name ON base_players(normalized_name);

-- Note: Run scripts/populate-normalized-names.ts after this to populate the values
