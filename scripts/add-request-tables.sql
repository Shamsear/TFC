-- Create RequestStatus enum type
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- Add window control columns to seasons table
ALTER TABLE seasons
ADD COLUMN release_window_open BOOLEAN DEFAULT FALSE,
ADD COLUMN swap_window_open BOOLEAN DEFAULT FALSE;

-- Create release_requests table
CREATE TABLE release_requests (
    id VARCHAR(36) PRIMARY KEY,
    season_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    refund_amount INTEGER NOT NULL,
    notes TEXT,
    status "RequestStatus" DEFAULT 'pending',
    window_opened_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(36),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES base_players(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create swap_requests table
CREATE TABLE swap_requests (
    id VARCHAR(36) PRIMARY KEY,
    season_id VARCHAR(36) NOT NULL,
    requesting_team_id VARCHAR(36) NOT NULL,
    target_team_id VARCHAR(36) NOT NULL,
    status "RequestStatus" DEFAULT 'pending',
    window_opened_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by VARCHAR(36),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (requesting_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (target_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create swap_request_players table (for the players involved in swap)
CREATE TABLE swap_request_players (
    id VARCHAR(36) PRIMARY KEY,
    swap_request_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    player_name VARCHAR(255) NOT NULL,
    from_team_id VARCHAR(36) NOT NULL,
    to_team_id VARCHAR(36) NOT NULL,
    player_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (swap_request_id) REFERENCES swap_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES base_players(id) ON DELETE CASCADE,
    FOREIGN KEY (from_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (to_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_release_requests_season ON release_requests(season_id);
CREATE INDEX idx_release_requests_team ON release_requests(team_id);
CREATE INDEX idx_release_requests_status ON release_requests(status);
CREATE INDEX idx_release_requests_window ON release_requests(window_opened_at);

CREATE INDEX idx_swap_requests_season ON swap_requests(season_id);
CREATE INDEX idx_swap_requests_requesting_team ON swap_requests(requesting_team_id);
CREATE INDEX idx_swap_requests_target_team ON swap_requests(target_team_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_requests_window ON swap_requests(window_opened_at);

CREATE INDEX idx_swap_request_players_request ON swap_request_players(swap_request_id);
CREATE INDEX idx_swap_request_players_player ON swap_request_players(player_id);
