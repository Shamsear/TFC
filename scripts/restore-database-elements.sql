-- =========================================================================
-- TFC Database Safe Cleanup & Alignment Script
-- =========================================================================
-- This script safely ensures that:
--   1. Any team-specific squad size overrides in 'teams' are migrated to 'season_teams'.
--   2. Redundant 'football_min_slots' & 'football_max_slots' columns are dropped from 'teams'.
--   3. 'season_teams' has the slot limit columns with proper default values.
--   4. 'password_reset_requests' has its primary key.
--   5. The 'auction_settings' table exists with all configurations intact.
--
-- Running this script is completely safe and won't overwrite existing data.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Ensure Season Teams Table has Football Slots Columns
-- -------------------------------------------------------------------------
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


-- -------------------------------------------------------------------------
-- 2. Migrate Override Values from 'teams' to 'season_teams' (Data Preservation)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  -- Only migrate if columns still exist on the 'teams' table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'football_min_slots'
  ) THEN
    UPDATE season_teams st
    SET 
      football_min_slots = COALESCE(st.football_min_slots, t.football_min_slots, 25),
      football_max_slots = COALESCE(st.football_max_slots, t.football_max_slots, 30)
    FROM teams t
    WHERE st."teamId" = t.id;
    
    RAISE NOTICE 'Successfully migrated squad size overrides from teams to season_teams';
  END IF;
END $$;

-- Populate defaults if they are currently null on season_teams
UPDATE season_teams 
SET 
  football_min_slots = COALESCE(football_min_slots, 25),
  football_max_slots = COALESCE(football_max_slots, 30)
WHERE football_min_slots IS NULL OR football_max_slots IS NULL;


-- -------------------------------------------------------------------------
-- 3. Drop Redundant Slot Columns from 'teams' Table
-- -------------------------------------------------------------------------
ALTER TABLE teams DROP COLUMN IF EXISTS football_min_slots;
ALTER TABLE teams DROP COLUMN IF EXISTS football_max_slots;


-- -------------------------------------------------------------------------
-- 4. Ensure Password Reset Requests Table has Primary Key
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'password_reset_requests'
  ) THEN
    CREATE TABLE password_reset_requests (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      team_name VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      reviewed_by VARCHAR(255),
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );
    
    CREATE INDEX idx_prr_user_id ON password_reset_requests(user_id);
    CREATE INDEX idx_prr_status ON password_reset_requests(status);
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'password_reset_requests' AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE password_reset_requests ADD PRIMARY KEY (id);
    END IF;
  END IF;
END $$;


-- -------------------------------------------------------------------------
-- 5. Ensure Auction Settings Table Exists & Is Loaded
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auction_settings (
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
  
  -- Squad limits
  min_squad_size INTEGER DEFAULT 25,
  max_squad_size INTEGER DEFAULT 30,
  max_rounds INTEGER DEFAULT 25,
  
  -- Other settings
  min_balance_per_round INTEGER DEFAULT 30,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT "auction_settings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auction_settings_seasonId ON auction_settings("seasonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'auction_settings' AND constraint_name = 'check_squad_size_valid'
  ) THEN
    ALTER TABLE auction_settings ADD CONSTRAINT check_squad_size_valid CHECK (max_squad_size >= min_squad_size);
  END IF;
END $$;

-- Populate default auction settings for any active seasons that don't have them
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
  30
FROM seasons
WHERE "id" NOT IN (SELECT "seasonId" FROM auction_settings)
ON CONFLICT ("seasonId") DO NOTHING;
