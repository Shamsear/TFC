-- ============================================
-- Fix Sequences to Match Current Data (SAFE)
-- ============================================
-- This script adjusts sequences to continue from the current max ID
-- Safe to run on any database - won't delete data
-- Useful when sequences get out of sync with actual data

-- ============================================
-- 1. Check current state
-- ============================================
SELECT 
    'starred_players' as table_name,
    COALESCE(MAX(id), 0) as max_id,
    (SELECT last_value FROM starred_players_id_seq) as sequence_value,
    CASE 
        WHEN COALESCE(MAX(id), 0) >= (SELECT last_value FROM starred_players_id_seq) 
        THEN '⚠️ NEEDS FIX' 
        ELSE '✓ OK' 
    END as status
FROM starred_players;

-- ============================================
-- 2. Fix starred_players sequence
-- ============================================
DO $$ 
DECLARE
    max_id INTEGER;
    new_seq_value INTEGER;
BEGIN
    -- Get the current max id
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM starred_players;
    
    -- Set sequence to max_id + 1 (or 1 if table is empty)
    new_seq_value := GREATEST(max_id + 1, 1);
    
    EXECUTE format('ALTER SEQUENCE starred_players_id_seq RESTART WITH %s', new_seq_value);
    
    RAISE NOTICE '✓ Fixed starred_players_id_seq: set to %', new_seq_value;
END $$;

-- ============================================
-- 3. Verify the fix
-- ============================================
SELECT 
    'starred_players' as table_name,
    COALESCE(MAX(id), 0) as max_id,
    (SELECT last_value FROM starred_players_id_seq) as sequence_value,
    CASE 
        WHEN COALESCE(MAX(id), 0) < (SELECT last_value FROM starred_players_id_seq) 
        THEN '✓ FIXED' 
        ELSE '⚠️ STILL NEEDS ATTENTION' 
    END as status
FROM starred_players;

-- ============================================
-- 4. Fix ALL sequences automatically (SAFE)
-- ============================================
-- This will fix all sequences in the database
-- Safe because it only adjusts to current max values

DO $$ 
DECLARE
    seq_record RECORD;
    table_name TEXT;
    column_name TEXT;
    max_id BIGINT;
    new_seq_value BIGINT;
BEGIN
    -- Loop through all sequences
    FOR seq_record IN 
        SELECT 
            s.sequencename,
            s.schemaname,
            c.relname as table_name,
            a.attname as column_name
        FROM pg_sequences s
        LEFT JOIN pg_class c ON c.relname = REPLACE(s.sequencename, '_id_seq', '')
        LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'id'
        WHERE s.schemaname = 'public'
        AND c.relname IS NOT NULL
    LOOP
        -- Try to get max id from the table
        BEGIN
            EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', seq_record.table_name) INTO max_id;
            
            -- Set sequence to max_id + 1
            new_seq_value := GREATEST(max_id + 1, 1);
            
            EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_record.sequencename, new_seq_value);
            
            RAISE NOTICE '✓ Fixed %: set to % (max id was %)', seq_record.sequencename, new_seq_value, max_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not fix %: %', seq_record.sequencename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- 5. Final verification - show all sequences
-- ============================================
SELECT 
    s.sequencename,
    s.last_value as current_sequence_value,
    COALESCE(
        (SELECT MAX(id) FROM starred_players WHERE s.sequencename = 'starred_players_id_seq'),
        0
    ) as max_table_id,
    CASE 
        WHEN s.sequencename = 'starred_players_id_seq' THEN
            CASE 
                WHEN s.last_value > COALESCE((SELECT MAX(id) FROM starred_players), 0) 
                THEN '✓ OK' 
                ELSE '⚠️ NEEDS FIX' 
            END
        ELSE 'N/A'
    END as status
FROM pg_sequences s
WHERE s.schemaname = 'public'
ORDER BY s.sequencename;

