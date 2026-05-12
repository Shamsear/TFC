-- Migration: Fix bulk_round_selections schema mismatch
-- Date: 2024-05-11
-- Description: Align database schema with Prisma schema

-- Step 1: Drop the existing table and recreate with correct types
DROP TABLE IF EXISTS bulk_round_selections CASCADE;

-- Step 2: Recreate table with correct schema
CREATE TABLE bulk_round_selections (
  id VARCHAR(50) PRIMARY KEY,  -- Changed from SERIAL to VARCHAR to match Prisma String type
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  selected_players TEXT NOT NULL DEFAULT '{}',  -- Changed from JSONB to TEXT to match Prisma
  submitted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_bulk_round_selections_round 
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bulk_round_selections_team 
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Unique constraint: one selection per team per round
  CONSTRAINT unique_bulk_round_team UNIQUE (round_id, team_id)
);

-- Indexes for performance
CREATE INDEX idx_bulk_round_selections_round ON bulk_round_selections(round_id);
CREATE INDEX idx_bulk_round_selections_team ON bulk_round_selections(team_id);

-- Comments
COMMENT ON TABLE bulk_round_selections IS 'Player selections for bulk rounds (fixed price)';
COMMENT ON COLUMN bulk_round_selections.id IS 'Composite ID: {round_id}_{team_id}';
COMMENT ON COLUMN bulk_round_selections.round_id IS 'Reference to rounds table';
COMMENT ON COLUMN bulk_round_selections.team_id IS 'Reference to teams table';
COMMENT ON COLUMN bulk_round_selections.selected_players IS 'JSON string containing player selections and metadata';
COMMENT ON COLUMN bulk_round_selections.submitted IS 'Whether team has finalized their selections';
COMMENT ON COLUMN bulk_round_selections.last_updated IS 'Last time selections were updated';
