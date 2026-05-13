-- ============================================
-- Add Min/Max Squad Size Support
-- ============================================
-- This migration adds min/max squad size columns to support
-- the new auction balance check system with mandatory minimum
-- and optional maximum squad sizes.

-- ============================================
-- 1. Fix auction_settings table structure
-- ============================================
-- Drop and recreate the table with correct structure
DROP TABLE IF EXISTS auction_settings CASCADE;

CREATE TABLE auction_settings (
  id SERIAL PRIMARY KEY,
  "seasonId" TEXT NOT NULL UNIQUE,
  auction_window VARCHAR(50) DEFAULT 'season_start',
  
  -- Phase boundaries
  phase_1_end_round INTEGER DEFAULT 18,
  phase_2_end_round INTEGER DEFAULT 20,
  
  -- Minimum balances per phase
  phase_1_min_balance INTEGER DEFAULT 30,
  phase_2_min_balance INTEGER DEFAULT 30,
  phase_3_min_balance INTEGER DEFAULT 10,
  
  -- Squad limits (NEW: min/max system)
  min_squad_size INTEGER DEFAULT 25,  -- Mandatory minimum
  max_squad_size INTEGER DEFAULT 30,  -- Optional maximum
  max_rounds INTEGER DEFAULT 25,
  
  -- Other settings
  contract_duration INTEGER DEFAULT 2,
  min_balance_per_round INTEGER DEFAULT 30,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key to seasons table
  CONSTRAINT "auction_settings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- ============================================
-- 2. Add min/max squad size columns to season_teams table
-- ============================================
-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'season_teams' AND column_name = 'football_min_slots'
  ) THEN
    ALTER TABLE season_teams ADD COLUMN football_min_slots INTEGER DEFAULT 25;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'season_teams' AND column_name = 'football_max_slots'
  ) THEN
    ALTER TABLE season_teams ADD COLUMN football_max_slots INTEGER DEFAULT 30;
  END IF;
END $$;

-- ============================================
-- 3. Update existing season_teams with default values
-- ============================================
UPDATE season_teams 
SET 
  football_min_slots = COALESCE(football_min_slots, 25),
  football_max_slots = COALESCE(football_max_slots, 30)
WHERE football_min_slots IS NULL OR football_max_slots IS NULL;

-- ============================================
-- 4. Add constraints and indexes
-- ============================================
-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auction_settings_seasonId 
  ON auction_settings("seasonId");

-- Ensure max >= min for auction_settings
ALTER TABLE auction_settings 
  ADD CONSTRAINT check_squad_size_valid 
  CHECK (max_squad_size >= min_squad_size);

-- Ensure max >= min for season_teams
ALTER TABLE season_teams 
  DROP CONSTRAINT IF EXISTS check_football_slots_valid;

ALTER TABLE season_teams 
  ADD CONSTRAINT check_football_slots_valid 
  CHECK (football_max_slots >= football_min_slots);

-- ============================================
-- 5. Insert default auction settings for existing seasons
-- ============================================
-- This will create default settings for any season that doesn't have them
INSERT INTO auction_settings (
  "seasonId",
  auction_window,
  phase_1_end_round,
  phase_1_min_balance,
  phase_2_end_round,
  phase_2_min_balance,
  phase_3_min_balance,
  min_squad_size,
  max_squad_size,
  max_rounds,
  contract_duration,
  min_balance_per_round
)
SELECT DISTINCT
  "id",
  'season_start',
  18,
  30,
  20,
  30,
  10,
  25,
  30,
  25,
  2,
  30
FROM seasons
WHERE "id" NOT IN (SELECT "seasonId" FROM auction_settings)
ON CONFLICT ("seasonId") DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration

-- Check auction_settings table
-- SELECT * FROM auction_settings;

-- Check season_teams with new columns
-- SELECT "id", "seasonId", football_min_slots, football_max_slots 
-- FROM season_teams LIMIT 10;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'season_teams'::regclass AND conname LIKE '%slots%';
