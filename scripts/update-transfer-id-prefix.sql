-- Update Transfer History ID Prefix from TFCTR to TFCTH
-- This script updates the id_counters table to use the new prefix

-- Step 1: Check if TFCTR exists and get its counter value
DO $$
DECLARE
    old_counter INTEGER;
BEGIN
    -- Get the current counter value from TFCTR if it exists
    SELECT counter INTO old_counter
    FROM id_counters
    WHERE prefix = 'TFCTR';

    -- If TFCTR exists, migrate to TFCTH
    IF old_counter IS NOT NULL THEN
        -- Insert or update TFCTH with the counter from TFCTR
        INSERT INTO id_counters (prefix, counter, updated_at)
        VALUES ('TFCTH', old_counter, NOW())
        ON CONFLICT (prefix) 
        DO UPDATE SET 
            counter = GREATEST(id_counters.counter, old_counter),
            updated_at = NOW();

        -- Delete the old TFCTR entry
        DELETE FROM id_counters WHERE prefix = 'TFCTR';
        
        RAISE NOTICE 'Migrated TFCTR counter (%) to TFCTH', old_counter;
    ELSE
        -- If TFCTR doesn't exist, just ensure TFCTH exists
        INSERT INTO id_counters (prefix, counter, updated_at)
        VALUES ('TFCTH', 0, NOW())
        ON CONFLICT (prefix) DO NOTHING;
        
        RAISE NOTICE 'Initialized TFCTH counter';
    END IF;
END $$;

-- Verify the change
SELECT prefix, counter, updated_at 
FROM id_counters 
WHERE prefix IN ('TFCTR', 'TFCTH')
ORDER BY prefix;
