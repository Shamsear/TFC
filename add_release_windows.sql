CREATE TABLE release_windows (
  id VARCHAR(36) PRIMARY KEY,
  season_id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMP(6) NOT NULL,
  end_date TIMESTAMP(6) NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPCOMING',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_season FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE
);

ALTER TABLE release_requests
ADD COLUMN release_window_id VARCHAR(36),
ADD CONSTRAINT fk_release_window FOREIGN KEY (release_window_id) REFERENCES release_windows(id) ON DELETE CASCADE;

CREATE INDEX idx_release_requests_release_window ON release_requests(release_window_id);
CREATE INDEX idx_release_windows_season ON release_windows(season_id);
