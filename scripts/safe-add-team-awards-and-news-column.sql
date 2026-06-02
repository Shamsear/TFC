-- Safe migration: Add team_awards table and preserve news.edited_by_admin column
-- This migration is designed to be safe and idempotent

-- Step 1: Add edited_by_admin column to news if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'news' AND column_name = 'edited_by_admin'
    ) THEN
        ALTER TABLE news ADD COLUMN edited_by_admin BOOLEAN DEFAULT false NOT NULL;
    END IF;
END $$;

-- Step 2: Create team_awards table if it doesn't exist
CREATE TABLE IF NOT EXISTS team_awards (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  season_team_id TEXT NOT NULL,
  award_type TEXT NOT NULL,
  award_period TEXT NOT NULL,
  matchday_number INT,
  week_number INT,
  points_earned INT NOT NULL,
  goals_for INT NOT NULL,
  goals_against INT NOT NULL,
  goal_difference INT NOT NULL,
  matches_played INT NOT NULL,
  wins INT NOT NULL,
  draws INT NOT NULL,
  losses INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_team_awards_tournament
    FOREIGN KEY (tournament_id)
    REFERENCES tournaments(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_team_awards_season_team
    FOREIGN KEY (season_team_id)
    REFERENCES season_teams(id)
    ON DELETE CASCADE,
    
  CONSTRAINT check_award_type
    CHECK (award_type IN ('TEAM_OF_THE_DAY', 'TEAM_OF_THE_WEEK'))
);

-- Step 3: Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_award_per_period'
    ) THEN
        ALTER TABLE team_awards 
        ADD CONSTRAINT unique_award_per_period 
        UNIQUE (tournament_id, award_type, award_period);
    END IF;
END $$;

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_team_awards_tournament ON team_awards(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_awards_season_team ON team_awards(season_team_id);
CREATE INDEX IF NOT EXISTS idx_team_awards_type ON team_awards(award_type);
CREATE INDEX IF NOT EXISTS idx_team_awards_period ON team_awards(tournament_id, award_type, award_period);

-- Step 5: Create TeamAwardType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TeamAwardType') THEN
        CREATE TYPE "TeamAwardType" AS ENUM ('TEAM_OF_THE_DAY', 'TEAM_OF_THE_WEEK');
    END IF;
END $$;

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as news_with_edited_flag FROM news WHERE edited_by_admin = true;
SELECT COUNT(*) as total_team_awards FROM team_awards;
