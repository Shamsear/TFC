-- Migration: Create team_tiebreaker_bids table
-- Date: 2024-01-15
-- Description: Stores new bids from teams participating in tiebreakers

CREATE TABLE IF NOT EXISTS team_tiebreaker_bids (
  id VARCHAR(50) PRIMARY KEY,
  tiebreaker_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  old_bid_amount INT NOT NULL,
  new_bid_amount INT,
  submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_team_tiebreaker_bids_tiebreaker FOREIGN KEY (tiebreaker_id) REFERENCES tiebreakers(id) ON DELETE CASCADE,
  CONSTRAINT fk_team_tiebreaker_bids_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint: one bid per team per tiebreaker
  CONSTRAINT unique_tiebreaker_team UNIQUE (tiebreaker_id, team_id),
  
  -- Check constraint: new bid must be higher than old bid
  CONSTRAINT check_new_bid_higher CHECK (new_bid_amount IS NULL OR new_bid_amount > old_bid_amount)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_tiebreaker_bids_tiebreaker ON team_tiebreaker_bids(tiebreaker_id);
CREATE INDEX IF NOT EXISTS idx_team_tiebreaker_bids_team ON team_tiebreaker_bids(team_id);
CREATE INDEX IF NOT EXISTS idx_team_tiebreaker_bids_submitted ON team_tiebreaker_bids(tiebreaker_id, submitted);

-- Comments
COMMENT ON TABLE team_tiebreaker_bids IS 'New bids submitted by teams in tiebreaker rounds';
COMMENT ON COLUMN team_tiebreaker_bids.id IS 'Composite ID: {tiebreaker_id}_{team_id}';
COMMENT ON COLUMN team_tiebreaker_bids.tiebreaker_id IS 'Reference to tiebreakers table';
COMMENT ON COLUMN team_tiebreaker_bids.team_id IS 'Reference to teams table';
COMMENT ON COLUMN team_tiebreaker_bids.old_bid_amount IS 'Original tied bid amount';
COMMENT ON COLUMN team_tiebreaker_bids.new_bid_amount IS 'New bid amount (must be higher)';
COMMENT ON COLUMN team_tiebreaker_bids.submitted IS 'Whether team has submitted their new bid';
COMMENT ON COLUMN team_tiebreaker_bids.submitted_at IS 'When team submitted their new bid';
