-- Migration: Create rounds table for auction system
-- Date: 2024-01-15
-- Description: Stores auction round information with timer and finalization settings

CREATE TABLE IF NOT EXISTS rounds (
  id VARCHAR(20) PRIMARY KEY,
  season_id VARCHAR(20) NOT NULL,
  position VARCHAR(50),
  round_number INT NOT NULL,
  round_type VARCHAR(10) NOT NULL CHECK (round_type IN ('normal', 'bulk')),
  max_bids_per_team INT,
  base_price INT,
  duration_seconds INT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft',
    'active',
    'finalizing',
    'completed',
    'expired_pending_finalization',
    'pending_finalization',
    'tiebreaker_pending',
    'cancelled'
  )),
  finalization_mode VARCHAR(20) DEFAULT 'auto' CHECK (finalization_mode IN ('auto', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_rounds_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
  
  -- Unique constraint
  CONSTRAINT unique_season_round_number UNIQUE (season_id, round_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rounds_season_id ON rounds(season_id);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_season_status ON rounds(season_id, status);
CREATE INDEX IF NOT EXISTS idx_rounds_end_time ON rounds(end_time) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_rounds_round_type ON rounds(round_type);

-- Comments
COMMENT ON TABLE rounds IS 'Auction rounds for player bidding system';
COMMENT ON COLUMN rounds.id IS 'Unique round identifier (e.g., SSPSLFR00001)';
COMMENT ON COLUMN rounds.season_id IS 'Reference to seasons table';
COMMENT ON COLUMN rounds.position IS 'Player position filter (e.g., ST, GK) - NULL for all positions';
COMMENT ON COLUMN rounds.round_number IS 'Sequential round number within season';
COMMENT ON COLUMN rounds.round_type IS 'Type of round: normal (blind bidding) or bulk (fixed price)';
COMMENT ON COLUMN rounds.max_bids_per_team IS 'Maximum number of bids each team can place';
COMMENT ON COLUMN rounds.base_price IS 'Base price for bulk rounds';
COMMENT ON COLUMN rounds.duration_seconds IS 'Round duration in seconds';
COMMENT ON COLUMN rounds.start_time IS 'When round becomes active (UTC)';
COMMENT ON COLUMN rounds.end_time IS 'When round expires (UTC)';
COMMENT ON COLUMN rounds.status IS 'Current round status';
COMMENT ON COLUMN rounds.finalization_mode IS 'auto: immediate finalization, manual: requires approval';
