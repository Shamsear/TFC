-- Create swap_windows table
CREATE TABLE IF NOT EXISTS swap_windows (
  id VARCHAR(36) PRIMARY KEY,
  season_id VARCHAR(36) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP(6) NOT NULL,
  end_date TIMESTAMP(6) NOT NULL,
  status VARCHAR(255) NOT NULL DEFAULT 'UPCOMING',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  swap_limit INT NOT NULL DEFAULT 5
);

-- Add index on season_id for swap_windows
CREATE INDEX IF NOT EXISTS idx_swap_windows_season ON swap_windows(season_id);

-- Add swap_window_id to swap_requests table
ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS swap_window_id VARCHAR(36) REFERENCES swap_windows(id) ON DELETE CASCADE;

-- Add index on swap_window_id for swap_requests
CREATE INDEX IF NOT EXISTS idx_swap_requests_swap_window ON swap_requests(swap_window_id);
