-- Update Tiebreaker ID Prefix to TFCTB
-- This script initializes the TFCTB counter in id_counters table

-- Initialize TFCTB counter if it doesn't exist
INSERT INTO id_counters (prefix, counter, updated_at)
VALUES ('TFCTB', 0, NOW())
ON CONFLICT (prefix) DO NOTHING;

-- Verify the change
SELECT prefix, counter, updated_at 
FROM id_counters 
WHERE prefix = 'TFCTB';
