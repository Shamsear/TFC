-- ============================================
-- Reset Auto-Increment Sequences
-- ============================================
-- This script resets SERIAL sequences to start from 1
-- WARNING: Only run this on development/test databases
-- Run this AFTER clearing data from tables

-- ============================================
-- Check current sequence values
-- ============================================
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- ============================================
-- Reset sequences for tables with SERIAL IDs
-- ============================================

-- starred_players (uses SERIAL id)
DO $$ 
BEGIN
  -- Get the max id from the table
  DECLARE
    max_id INTEGER;
  BEGIN
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM starred_players;
    
    -- Reset sequence to max_id + 1, or 1 if table is empty
    EXECUTE format('ALTER SEQUENCE starred_players_id_seq RESTART WITH %s', GREATEST(max_id + 1, 1));
    
    RAISE NOTICE 'Reset starred_players_id_seq to %', GREATEST(max_id + 1, 1);
  END;
END $$;

-- bid_audit_log (if it uses SERIAL)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.sequences 
    WHERE sequence_name = 'bid_audit_log_id_seq'
  ) THEN
    DECLARE
      max_id INTEGER;
    BEGIN
      SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) INTO max_id FROM bid_audit_log WHERE id ~ '^\d+$';
      
      IF max_id > 0 THEN
        EXECUTE format('ALTER SEQUENCE bid_audit_log_id_seq RESTART WITH %s', max_id + 1);
        RAISE NOTICE 'Reset bid_audit_log_id_seq to %', max_id + 1;
      ELSE
        ALTER SEQUENCE bid_audit_log_id_seq RESTART WITH 1;
        RAISE NOTICE 'Reset bid_audit_log_id_seq to 1';
      END IF;
    END;
  ELSE
    RAISE NOTICE 'bid_audit_log_id_seq does not exist (table may use TEXT id)';
  END IF;
END $$;

-- ============================================
-- Alternative: Reset ALL sequences to 1 (DANGEROUS!)
-- ============================================
-- Uncomment this section ONLY if you want to reset all sequences
-- and you are CERTAIN all tables are empty

/*
DO $$ 
DECLARE
  seq RECORD;
BEGIN
  FOR seq IN 
    SELECT sequencename 
    FROM pg_sequences 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', seq.sequencename);
    RAISE NOTICE 'Reset % to 1', seq.sequencename;
  END LOOP;
END $$;
*/

-- ============================================
-- Verify sequence values after reset
-- ============================================
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- ============================================
-- NOTES
-- ============================================
-- Most tables in your schema use TEXT-based IDs (generated via functions)
-- Only tables with SERIAL/INTEGER auto-increment need sequence resets:
--   - starred_players (id SERIAL)
--   - Any other tables with SERIAL PRIMARY KEY
--
-- Tables with TEXT IDs (like teams, seasons, users, etc.) don't use sequences
-- and don't need to be reset.

