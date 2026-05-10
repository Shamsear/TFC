-- Migration: Create bulk tiebreaker tables
-- Date: 2024-01-15
-- Description: Stores bulk tiebreaker information (last person standing auction)

-- Main bulk tiebreakers table
CREATE TABLE IF NOT EXISTS bulk_tiebreakers (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  base_player_id VARCHAR(20) NOT NULL,
  base_price INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  current_highest_bid INT,
  current_highest_team_id VARCHAR(20),
  teams_remaining INT NOT NULL,
  start_time TIMESTAMPTZ,
  max_end_time TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_bulk_tiebreakers_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_tiebreakers_player FOREIGN KEY (base_player_id) REFERENCES base_players(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_tiebreakers_highest_team FOREIGN KEY (current_highest_team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- Participants table
CREATE TABLE IF NOT EXISTS bulk_tiebreaker_participants (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'eliminated')),
  current_bid INT,
  last_bid_time TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  
  -- Foreign key constraints
  CONSTRAINT fk_bulk_tiebreaker_participants_tiebreaker FOREIGN KEY (tiebreaker_id) REFERENCES bulk_tiebreakers(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_tiebreaker_participants_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint: one entry per team per tiebreaker
  CONSTRAINT unique_bulk_tiebreaker_team UNIQUE (tiebreaker_id, team_id)
);

-- Bid history table
CREATE TABLE IF NOT EXISTS bulk_tiebreaker_bid_history (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  bid_amount INT NOT NULL,
  bid_time TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_bulk_tiebreaker_bid_history_tiebreaker FOREIGN KEY (tiebreaker_id) REFERENCES bulk_tiebreakers(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_tiebreaker_bid_history_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreakers_round ON bulk_tiebreakers(round_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreakers_player ON bulk_tiebreakers(base_player_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreakers_status ON bulk_tiebreakers(status);

CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_participants_tiebreaker ON bulk_tiebreaker_participants(tiebreaker_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_participants_team ON bulk_tiebreaker_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_participants_status ON bulk_tiebreaker_participants(tiebreaker_id, status);

CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_bid_history_tiebreaker ON bulk_tiebreaker_bid_history(tiebreaker_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_bid_history_team ON bulk_tiebreaker_bid_history(team_id);
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreaker_bid_history_time ON bulk_tiebreaker_bid_history(bid_time DESC);

-- Comments
COMMENT ON TABLE bulk_tiebreakers IS 'Bulk tiebreakers for resolving conflicts in bulk rounds (last person standing)';
COMMENT ON COLUMN bulk_tiebreakers.base_price IS 'Starting price from bulk round';
COMMENT ON COLUMN bulk_tiebreakers.current_highest_bid IS 'Current highest bid amount';
COMMENT ON COLUMN bulk_tiebreakers.current_highest_team_id IS 'Team with current highest bid';
COMMENT ON COLUMN bulk_tiebreakers.teams_remaining IS 'Number of teams still active';
COMMENT ON COLUMN bulk_tiebreakers.max_end_time IS '24-hour safety limit';

COMMENT ON TABLE bulk_tiebreaker_participants IS 'Teams participating in bulk tiebreaker';
COMMENT ON COLUMN bulk_tiebreaker_participants.status IS 'active: still bidding, withdrawn: dropped out, eliminated: outbid';

COMMENT ON TABLE bulk_tiebreaker_bid_history IS 'Complete bid history for bulk tiebreakers';
