-- ============================================
-- Add Min/Max Squad Size Support
-- ============================================
-- This migration adds min/max squad size columns to support
-- the new auction balance check system with mandatory minimum
-- and optional maximum squad sizes.

-- ============================================
-- 1. Create auction_settings table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS auction_settings (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(50) NOT NULL UNIQUE,
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
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. Add min/max squad size columns to teams table
-- ============================================
-- Add columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'football_min_slots'
  ) THEN
    ALTER TABLE teams ADD COLUMN football_min_slots INTEGER DEFAULT 25;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'football_max_slots'
  ) THEN
    ALTER TABLE teams ADD COLUMN football_max_slots INTEGER DEFAULT 30;
  END IF;
END $$;

-- ============================================
-- 3. Update existing teams with default values
-- ============================================
UPDATE teams 
SET 
  football_min_slots = COALESCE(football_min_slots, 25),
  football_max_slots = COALESCE(football_max_slots, 30)
WHERE football_min_slots IS NULL OR football_max_slots IS NULL;

-- ============================================
-- 4. Add constraints
-- ============================================
-- Ensure max >= min
ALTER TABLE teams 
  DROP CONSTRAINT IF EXISTS check_football_slots_valid;

ALTER TABLE teams 
  ADD CONSTRAINT check_football_slots_valid 
  CHECK (football_max_slots >= football_min_slots);

-- Same for auction_settings
ALTER TABLE auction_settings 
  DROP CONSTRAINT IF EXISTS check_squad_size_valid;

ALTER TABLE auction_settings 
  ADD CONSTRAINT check_squad_size_valid 
  CHECK (max_squad_size >= min_squad_size);

-- ============================================
-- 5. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_auction_settings_season_id 
  ON auction_settings(season_id);

-- ============================================
-- 6. Insert default auction settings for existing seasons
-- ============================================
-- This will create default settings for any season that doesn't have them
INSERT INTO auction_settings (
  season_id,
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
  season_id,
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
FROM teams
WHERE season_id NOT IN (SELECT season_id FROM auction_settings)
ON CONFLICT (season_id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration

-- Check auction_settings table
-- SELECT * FROM auction_settings;

-- Check teams with new columns
-- SELECT id, season_id, football_min_slots, football_max_slots, football_players_count 
-- FROM teams LIMIT 10;

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'teams'::regclass AND conname LIKE '%slots%';
