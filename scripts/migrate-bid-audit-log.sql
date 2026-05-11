-- Migrate bid_audit_log table from Int ID to String ID (TFCBA format)
-- This script drops and recreates the bid_audit_log table

-- Step 1: Drop existing table
DROP TABLE IF EXISTS bid_audit_log CASCADE;

-- Step 2: Create new table with String ID
CREATE TABLE bid_audit_log (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  action TEXT NOT NULL,
  encrypted_bids TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT bid_audit_log_round_id_fkey FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

-- Step 3: Create indexes
CREATE INDEX bid_audit_log_round_id_idx ON bid_audit_log(round_id);
CREATE INDEX bid_audit_log_team_id_idx ON bid_audit_log(team_id);
CREATE INDEX bid_audit_log_timestamp_idx ON bid_audit_log(timestamp);

-- Step 4: Initialize the counter for TFCBA prefix
INSERT INTO id_counters (prefix, counter, updated_at)
VALUES ('TFCBA', 0, NOW())
ON CONFLICT (prefix) DO NOTHING;

-- Verify the changes
SELECT 'Migration complete!' as status;
SELECT prefix, counter FROM id_counters WHERE prefix = 'TFCBA';
