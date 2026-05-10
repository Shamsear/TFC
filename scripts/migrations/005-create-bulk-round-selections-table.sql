-- Migration: Create bulk_round_selections table
-- Date: 2024-01-15
-- Description: Stores player selections for bulk rounds (fixed price, multiple players)

CREATE TABLE IF NOT EXISTS bulk_round_selections (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  selected_players JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_bulk_round_selections_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_round_selections_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint: one selection per team per round
  CONSTRAINT unique_bulk_round_team UNIQUE (round_id, team_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_round_selections_round ON bulk_round_selections(round_id);
CREATE INDEX IF NOT EXISTS idx_bulk_round_selections_team ON bulk_round_selections(team_id);
CREATE INDEX IF NOT EXISTS idx_bulk_round_selections_submitted ON bulk_round_selections(round_id, submitted);

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_bulk_round_selections_players ON bulk_round_selections USING GIN (selected_players);

-- Comments
COMMENT ON TABLE bulk_round_selections IS 'Player selections for bulk rounds (fixed price)';
COMMENT ON COLUMN bulk_round_selections.round_id IS 'Reference to rounds table';
COMMENT ON COLUMN bulk_round_selections.team_id IS 'Reference to teams table';
COMMENT ON COLUMN bulk_round_selections.selected_players IS 'JSONB array of base_player_id values';
COMMENT ON COLUMN bulk_round_selections.submitted IS 'Whether team has finalized their selections';
COMMENT ON COLUMN bulk_round_selections.last_updated IS 'Last time selections were updated';
COMMENT ON COLUMN bulk_round_selections.submitted_at IS 'When team submitted final selections';
