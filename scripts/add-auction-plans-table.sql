-- Create auction_plans table to store encrypted team auction planning data
-- This table stores strategic auction plans that should be private to each team

CREATE TABLE IF NOT EXISTS auction_plans (
  id SERIAL PRIMARY KEY,
  season_team_id TEXT NOT NULL REFERENCES season_teams(id) ON DELETE CASCADE,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Encrypted JSON data containing the full auction plan
  -- Structure: { positions: { [position]: { minPlayers, maxPlayers, targets: [...] } } }
  encrypted_plan_data TEXT NOT NULL,
  
  -- Metadata (not encrypted)
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one plan per team per season
  UNIQUE(season_team_id, season_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auction_plans_season_team ON auction_plans(season_team_id);
CREATE INDEX IF NOT EXISTS idx_auction_plans_team_season ON auction_plans(team_id, season_id);

-- Add trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_auction_plans_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_auction_plans_timestamp
  BEFORE UPDATE ON auction_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_auction_plans_timestamp();

COMMENT ON TABLE auction_plans IS 'Stores encrypted auction planning data for teams';
COMMENT ON COLUMN auction_plans.encrypted_plan_data IS 'AES-256 encrypted JSON containing position plans and player targets';
