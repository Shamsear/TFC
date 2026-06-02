-- Add team_awards table for tracking Team of the Day and Team of the Week awards
-- This allows storing historical awards for teams

CREATE TABLE IF NOT EXISTS team_awards (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  season_team_id TEXT NOT NULL,
  award_type TEXT NOT NULL, -- 'TEAM_OF_THE_DAY' or 'TEAM_OF_THE_WEEK'
  award_period TEXT NOT NULL, -- e.g., 'Matchday 5' or 'Week 2 (MD 8-14)'
  matchday_number INT, -- For Team of the Day
  week_number INT, -- For Team of the Week
  points_earned INT NOT NULL,
  goals_for INT NOT NULL,
  goals_against INT NOT NULL,
  goal_difference INT NOT NULL,
  matches_played INT NOT NULL,
  wins INT NOT NULL,
  draws INT NOT NULL,
  losses INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_team_awards_tournament
    FOREIGN KEY (tournament_id)
    REFERENCES tournaments(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_team_awards_season_team
    FOREIGN KEY (season_team_id)
    REFERENCES season_teams(id)
    ON DELETE CASCADE,
    
  CONSTRAINT check_award_type
    CHECK (award_type IN ('TEAM_OF_THE_DAY', 'TEAM_OF_THE_WEEK')),
    
  -- Prevent duplicate awards for same period
  CONSTRAINT unique_award_per_period
    UNIQUE (tournament_id, award_type, award_period)
);

-- Create indexes for faster queries
CREATE INDEX idx_team_awards_tournament ON team_awards(tournament_id);
CREATE INDEX idx_team_awards_season_team ON team_awards(season_team_id);
CREATE INDEX idx_team_awards_type ON team_awards(award_type);
CREATE INDEX idx_team_awards_period ON team_awards(tournament_id, award_type, award_period);

-- Comments
COMMENT ON TABLE team_awards IS 'Stores Team of the Day and Team of the Week awards for tournaments';
COMMENT ON COLUMN team_awards.award_type IS 'Type of award: TEAM_OF_THE_DAY or TEAM_OF_THE_WEEK';
COMMENT ON COLUMN team_awards.award_period IS 'Human-readable period label, e.g., Matchday 5 or Week 2 (MD 8-14)';
COMMENT ON COLUMN team_awards.matchday_number IS 'The matchday number for Team of the Day awards';
COMMENT ON COLUMN team_awards.week_number IS 'The week number for Team of the Week awards';
