-- ============================================
-- Add Starred Players Feature
-- ============================================
-- This migration adds the ability for teams to star/favorite
-- players so they appear at the top of the list in auction rounds

-- ============================================
-- 1. Create starred_players table
-- ============================================
-- This table tracks which players each team has starred
DROP TABLE IF EXISTS starred_players CASCADE;

CREATE TABLE starred_players (
  id SERIAL PRIMARY KEY,
  "seasonTeamId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  starred_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure a team can only star a player once per season
  CONSTRAINT "starred_players_unique" UNIQUE ("seasonTeamId", "playerId", "seasonId"),
  
  -- Foreign keys
  CONSTRAINT "starred_players_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE,
  CONSTRAINT "starred_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "base_players"("id") ON DELETE CASCADE,
  CONSTRAINT "starred_players_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- ============================================
-- 2. Create indexes for performance
-- ============================================
CREATE INDEX idx_starred_players_seasonTeamId ON starred_players("seasonTeamId");
CREATE INDEX idx_starred_players_playerId ON starred_players("playerId");
CREATE INDEX idx_starred_players_seasonId ON starred_players("seasonId");
CREATE INDEX idx_starred_players_lookup ON starred_players("seasonTeamId", "seasonId");

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration

-- Check starred_players table
-- SELECT * FROM starred_players;

-- Check indexes
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'starred_players';
