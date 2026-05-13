-- ============================================
-- Add position_group columns to tables
-- ============================================
-- This migration adds position_group support for position-based grouping

-- ============================================
-- 1. Add position_group to seasonal_player_stats
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seasonal_player_stats' 
    AND column_name = 'position_group'
  ) THEN
    ALTER TABLE seasonal_player_stats 
    ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B'));
    
    CREATE INDEX idx_seasonal_player_stats_position_group 
    ON seasonal_player_stats(position, position_group);
    
    RAISE NOTICE 'Added position_group to seasonal_player_stats';
  ELSE
    RAISE NOTICE 'position_group already exists in seasonal_player_stats';
  END IF;
END $$;

-- ============================================
-- 2. Add position_group to auction_slots
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_slots' 
    AND column_name = 'position_group'
  ) THEN
    ALTER TABLE auction_slots 
    ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));
    
    -- Default to 'ALL' for existing slots
    UPDATE auction_slots SET position_group = 'ALL' WHERE position_group IS NULL;
    
    RAISE NOTICE 'Added position_group to auction_slots';
  ELSE
    RAISE NOTICE 'position_group already exists in auction_slots';
  END IF;
END $$;

-- ============================================
-- 3. Add position_group to rounds
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rounds' 
    AND column_name = 'position_group'
  ) THEN
    ALTER TABLE rounds 
    ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));
    
    RAISE NOTICE 'Added position_group to rounds';
  ELSE
    RAISE NOTICE 'position_group already exists in rounds';
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration

-- Check seasonal_player_stats
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'seasonal_player_stats' AND column_name = 'position_group';

-- Check auction_slots
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'auction_slots' AND column_name = 'position_group';

-- Check rounds
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'rounds' AND column_name = 'position_group';

