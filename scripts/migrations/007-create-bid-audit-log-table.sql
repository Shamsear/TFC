-- Migration: Create bid_audit_log table (optional)
-- Date: 2024-01-15
-- Description: Append-only audit log for bid updates (backup/recovery/debugging)

CREATE TABLE IF NOT EXISTS bid_audit_log (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'submit', 'finalize')),
  encrypted_bids TEXT NOT NULL,
  bid_count INT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_bid_audit_log_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  CONSTRAINT fk_bid_audit_log_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_audit_log_round ON bid_audit_log(round_id);
CREATE INDEX IF NOT EXISTS idx_bid_audit_log_team ON bid_audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_bid_audit_log_timestamp ON bid_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bid_audit_log_round_team ON bid_audit_log(round_id, team_id, timestamp DESC);

-- Comments
COMMENT ON TABLE bid_audit_log IS 'Append-only audit log for all bid updates (backup/recovery)';
COMMENT ON COLUMN bid_audit_log.action IS 'Type of action: create, update, submit, finalize';
COMMENT ON COLUMN bid_audit_log.encrypted_bids IS 'Snapshot of encrypted bids at this point in time';
COMMENT ON COLUMN bid_audit_log.bid_count IS 'Number of bids in snapshot';
COMMENT ON COLUMN bid_audit_log.timestamp IS 'When this action occurred';
