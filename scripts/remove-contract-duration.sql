-- ============================================
-- Remove contract_duration and add default_max_bids_per_team
-- ============================================
-- This migration removes the unused contract_duration column
-- and adds default_max_bids_per_team to auction_settings

-- Remove contract_duration column if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_settings' AND column_name = 'contract_duration'
  ) THEN
    ALTER TABLE auction_settings DROP COLUMN contract_duration;
    RAISE NOTICE 'contract_duration column removed from auction_settings';
  ELSE
    RAISE NOTICE 'contract_duration column does not exist in auction_settings';
  END IF;
END $$;

-- Add default_max_bids_per_team column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_settings' AND column_name = 'default_max_bids_per_team'
  ) THEN
    ALTER TABLE auction_settings ADD COLUMN default_max_bids_per_team INTEGER DEFAULT 10;
    RAISE NOTICE 'default_max_bids_per_team column added to auction_settings';
  ELSE
    RAISE NOTICE 'default_max_bids_per_team column already exists in auction_settings';
  END IF;
END $$;

-- Update existing rows to have default value if NULL
UPDATE auction_settings 
SET default_max_bids_per_team = 10 
WHERE default_max_bids_per_team IS NULL;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'auction_settings'
ORDER BY ordinal_position;
