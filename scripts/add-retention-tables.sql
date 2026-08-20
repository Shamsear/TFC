-- =====================================================
-- PLAYER RETENTION SYSTEM - DATABASE MIGRATION
-- =====================================================
-- This script creates the retention_windows and retention_requests tables
-- for the player retention feature where teams can retain players from
-- their previous season at the player's old squad value.

-- Create retention_windows table
CREATE TABLE IF NOT EXISTS retention_windows (
  id VARCHAR(36) PRIMARY KEY,
  season_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP(6) NOT NULL,
  end_date TIMESTAMP(6) NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'UPCOMING',
  retention_limit INTEGER NOT NULL DEFAULT 3,
  banned_team_ids TEXT, -- JSON array of team IDs that are banned from retention
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  CONSTRAINT fk_retention_window_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

-- Create retention_requests table
CREATE TABLE IF NOT EXISTS retention_requests (
    id VARCHAR(36) PRIMARY KEY,
    season_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    old_squad_value INTEGER NOT NULL,
    previous_season_id VARCHAR(36) NOT NULL,
    retention_window_id VARCHAR(36),
    status "RequestStatus" DEFAULT 'pending',
    window_opened_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(36),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_retention_request_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_request_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_request_player FOREIGN KEY (player_id) REFERENCES base_players(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_request_previous_season FOREIGN KEY (previous_season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_request_window FOREIGN KEY (retention_window_id) REFERENCES retention_windows(id) ON DELETE CASCADE,
    CONSTRAINT fk_retention_request_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retention_windows_season ON retention_windows(season_id);
CREATE INDEX IF NOT EXISTS idx_retention_windows_status ON retention_windows(status);
CREATE INDEX IF NOT EXISTS idx_retention_windows_dates ON retention_windows(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_retention_requests_season ON retention_requests(season_id);
CREATE INDEX IF NOT EXISTS idx_retention_requests_team ON retention_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_retention_requests_player ON retention_requests(player_id);
CREATE INDEX IF NOT EXISTS idx_retention_requests_status ON retention_requests(status);
CREATE INDEX IF NOT EXISTS idx_retention_requests_window ON retention_requests(retention_window_id);
CREATE INDEX IF NOT EXISTS idx_retention_requests_previous_season ON retention_requests(previous_season_id);
CREATE INDEX IF NOT EXISTS idx_retention_requests_window_opened ON retention_requests(window_opened_at);

-- Add comments for documentation
COMMENT ON TABLE retention_windows IS 'Defines retention windows where teams can retain players from previous season';
COMMENT ON TABLE retention_requests IS 'Stores player retention requests from teams';
COMMENT ON COLUMN retention_windows.retention_limit IS 'Maximum number of players a team can retain in this window';
COMMENT ON COLUMN retention_windows.banned_team_ids IS 'JSON array of team IDs that cannot use retention feature';
COMMENT ON COLUMN retention_requests.old_squad_value IS 'The player value from their previous season squad';
COMMENT ON COLUMN retention_requests.previous_season_id IS 'The season from which the player is being retained';
