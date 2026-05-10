-- Migration: Create team_round_bids table
-- Date: 2024-01-15
-- Description: Stores encrypted bids for each team per round (single row per team per round)

CREATE TABLE IF NOT EXISTS team_round_bids (
  id VARCHAR(50) PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  encrypted_bids TEXT NOT NULL,
  submitted BOOLEAN DEFAULT FALSE,
  bid_count INT DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_team_round_bids_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_round_bids_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint: one row per team per round
  CONSTRAINT unique_round_team UNIQUE (round_id, team_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_round_bids_round ON team_round_bids(round_id);
CREATE INDEX IF NOT EXISTS idx_team_round_bids_team ON team_round_bids(team_id);
CREATE INDEX IF NOT EXISTS idx_team_round_bids_submitted ON team_round_bids(round_id, submitted);

-- Comments
COMMENT ON TABLE team_round_bids IS 'Encrypted bid storage - one row per team per round';
COMMENT ON COLUMN team_round_bids.id IS 'Composite ID: {round_id}_{team_id}';
COMMENT ON COLUMN team_round_bids.round_id IS 'Reference to rounds table';
COMMENT ON COLUMN team_round_bids.team_id IS 'Reference to teams table';
COMMENT ON COLUMN team_round_bids.encrypted_bids IS 'AES-256-GCM encrypted JSON blob containing all bids';
COMMENT ON COLUMN team_round_bids.submitted IS 'Whether team has finalized their bids';
COMMENT ON COLUMN team_round_bids.bid_count IS 'Number of bids in encrypted_bids (for quick validation)';
COMMENT ON COLUMN team_round_bids.last_updated IS 'Last time bids were updated';
COMMENT ON COLUMN team_round_bids.submitted_at IS 'When team submitted final bids';
