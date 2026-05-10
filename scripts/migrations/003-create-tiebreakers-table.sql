-- Migration: Create tiebreakers table
-- Date: 2024-01-15
-- Description: Stores tiebreaker information for normal rounds when multiple teams bid same amount

CREATE TABLE IF NOT EXISTS tiebreakers (
  id VARCHAR(20) PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  base_player_id VARCHAR(20) NOT NULL,
  original_amount INT NOT NULL,
  tied_teams_count INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  winning_team_id VARCHAR(20),
  winning_bid INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_tiebreakers_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_tiebreakers_player FOREIGN KEY (base_player_id) REFERENCES base_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_tiebreakers_winning_team FOREIGN KEY (winning_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tiebreakers_round ON tiebreakers(round_id);
CREATE INDEX IF NOT EXISTS idx_tiebreakers_player ON tiebreakers(base_player_id);
CREATE INDEX IF NOT EXISTS idx_tiebreakers_status ON tiebreakers(status);
CREATE INDEX IF NOT EXISTS idx_tiebreakers_round_status ON tiebreakers(round_id, status);

-- Comments
COMMENT ON TABLE tiebreakers IS 'Tiebreaker rounds for resolving tied bids in normal rounds';
COMMENT ON COLUMN tiebreakers.id IS 'Unique tiebreaker identifier (e.g., SSPSLFTB0001)';
COMMENT ON COLUMN tiebreakers.round_id IS 'Reference to parent round';
COMMENT ON COLUMN tiebreakers.base_player_id IS 'Player being contested';
COMMENT ON COLUMN tiebreakers.original_amount IS 'Original tied bid amount';
COMMENT ON COLUMN tiebreakers.tied_teams_count IS 'Number of teams that tied';
COMMENT ON COLUMN tiebreakers.status IS 'Tiebreaker status';
COMMENT ON COLUMN tiebreakers.winning_team_id IS 'Team that won the tiebreaker';
COMMENT ON COLUMN tiebreakers.winning_bid IS 'Final winning bid amount';
