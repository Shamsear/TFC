-- ============================================
-- Clear and Reset Specific Tables
-- ============================================
-- WARNING: This will DELETE ALL DATA from specified tables
-- Only run this on development/test databases
-- DO NOT RUN ON PRODUCTION

-- ============================================
-- Option 1: Clear starred_players and reset sequence
-- ============================================
DO $$ 
BEGIN
  RAISE NOTICE 'Clearing starred_players table...';
  DELETE FROM starred_players;
  ALTER SEQUENCE starred_players_id_seq RESTART WITH 1;
  RAISE NOTICE 'Cleared starred_players and reset sequence to 1';
END $$;

-- ============================================
-- Option 2: Clear audit logs (if needed)
-- ============================================
-- Uncomment if you want to clear audit logs
/*
DO $$ 
BEGIN
  RAISE NOTICE 'Clearing audit_logs table...';
  DELETE FROM audit_logs;
  RAISE NOTICE 'Cleared audit_logs';
END $$;
*/

-- ============================================
-- Option 3: Clear bid audit logs (if needed)
-- ============================================
-- Uncomment if you want to clear bid audit logs
/*
DO $$ 
BEGIN
  RAISE NOTICE 'Clearing bid_audit_log table...';
  DELETE FROM bid_audit_log;
  RAISE NOTICE 'Cleared bid_audit_log';
END $$;
*/

-- ============================================
-- Option 4: Clear financial ledger (DANGEROUS!)
-- ============================================
-- Uncomment ONLY if you want to clear all financial records
-- This will remove all transaction history
/*
DO $$ 
BEGIN
  RAISE NOTICE 'Clearing financial_ledger table...';
  DELETE FROM financial_ledger;
  RAISE NOTICE 'Cleared financial_ledger';
END $$;
*/

-- ============================================
-- Option 5: Clear all auction-related data (VERY DANGEROUS!)
-- ============================================
-- Uncomment ONLY if you want to clear all auction data
-- This will cascade delete rounds, bids, tiebreakers, etc.
/*
DO $$ 
BEGIN
  RAISE NOTICE 'Clearing all auction data...';
  
  -- Delete in order to respect foreign keys
  DELETE FROM bid_audit_log;
  DELETE FROM preview_allocations;
  DELETE FROM team_tiebreaker_bids;
  DELETE FROM tiebreakers;
  DELETE FROM bulk_tiebreaker_bids;
  DELETE FROM bulk_tiebreaker_participants;
  DELETE FROM bulk_tiebreakers;
  DELETE FROM bulk_round_selections;
  DELETE FROM team_round_bids;
  DELETE FROM transfer_history;
  DELETE FROM rounds;
  DELETE FROM auction_slots;
  DELETE FROM auction_calendar;
  
  RAISE NOTICE 'Cleared all auction data';
END $$;
*/

-- ============================================
-- Option 6: Reset entire season (EXTREMELY DANGEROUS!)
-- ============================================
-- Uncomment ONLY if you want to completely reset a season
-- Replace 'TFCS-4' with your season ID
/*
DO $$ 
DECLARE
  target_season_id TEXT := 'TFCS-4';
BEGIN
  RAISE NOTICE 'Resetting season %...', target_season_id;
  
  -- Delete all season-related data (cascades will handle most)
  DELETE FROM financial_ledger WHERE "seasonId" = target_season_id;
  DELETE FROM transfer_history WHERE "seasonId" = target_season_id;
  DELETE FROM rounds WHERE season_id = target_season_id;
  DELETE FROM auction_calendar WHERE "seasonId" = target_season_id;
  DELETE FROM retentions WHERE "seasonId" = target_season_id;
  DELETE FROM season_teams WHERE "seasonId" = target_season_id;
  DELETE FROM seasonal_player_stats WHERE "seasonId" = target_season_id;
  DELETE FROM starred_players WHERE "seasonId" = target_season_id;
  
  -- Reset starred_players sequence if empty
  IF NOT EXISTS (SELECT 1 FROM starred_players) THEN
    ALTER SEQUENCE starred_players_id_seq RESTART WITH 1;
  END IF;
  
  RAISE NOTICE 'Reset season % complete', target_season_id;
END $$;
*/

-- ============================================
-- Verify table counts after clearing
-- ============================================
SELECT 
  'starred_players' as table_name, 
  COUNT(*) as row_count 
FROM starred_players
UNION ALL
SELECT 
  'financial_ledger' as table_name, 
  COUNT(*) as row_count 
FROM financial_ledger
UNION ALL
SELECT 
  'rounds' as table_name, 
  COUNT(*) as row_count 
FROM rounds
UNION ALL
SELECT 
  'transfer_history' as table_name, 
  COUNT(*) as row_count 
FROM transfer_history
ORDER BY table_name;

-- ============================================
-- Check sequence values
-- ============================================
SELECT 
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

