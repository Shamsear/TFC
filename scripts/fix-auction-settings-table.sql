-- ============================================
-- Fix auction_settings table structure
-- ============================================
-- This script forcefully recreates the auction_settings table
-- with the correct structure

-- Drop the existing table completely
DROP TABLE IF EXISTS auction_settings CASCADE;

-- Create the table with correct structure (using camelCase seasonId)
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
  
  -- Squad limits (min/max system)
  min_squad_size INTEGER DEFAULT 25,
  max_squad_size INTEGER DEFAULT 30,
  max_rounds INTEGER DEFAULT 25,
  
  -- Other settings
  contract_duration INTEGER DEFAULT 2,
  min_balance_per_round INTEGER DEFAULT 30,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key to seasons table
  CONSTRAINT "auction_settings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Create index
CREATE INDEX idx_auction_settings_seasonId ON auction_settings("seasonId");

-- Add constraint
ALTER TABLE auction_settings 
  ADD CONSTRAINT check_squad_size_valid 
  CHECK (max_squad_size >= min_squad_size);

-- Insert default settings for all existing seasons
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
ON CONFLICT ("seasonId") DO NOTHING;

-- Verify
SELECT 'auction_settings table created successfully' as status;
SELECT COUNT(*) as total_settings FROM auction_settings;
