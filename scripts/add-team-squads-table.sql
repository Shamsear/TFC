-- Create team_squads table to store squad formations
CREATE TABLE IF NOT EXISTS team_squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  formation JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, season_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_squads_team_season ON team_squads(team_id, season_id);

-- Add comment
COMMENT ON TABLE team_squads IS 'Stores team squad formations with starting XI and substitutes';
COMMENT ON COLUMN team_squads.formation IS 'JSON object containing starting XI positions and substitutes list';
