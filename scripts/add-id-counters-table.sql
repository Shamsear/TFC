-- Create ID counters table for thread-safe ID generation
CREATE TABLE IF NOT EXISTS id_counters (
  prefix VARCHAR(10) PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Initialize counters based on existing data
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCP', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM base_players
WHERE id LIKE 'TFCP-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM seasons
WHERE id LIKE 'TFCS-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCU', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM users
WHERE id LIKE 'TFCU-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCT', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM tournaments
WHERE id LIKE 'TFCT-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCM', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM teams
WHERE id LIKE 'TFCM-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCMA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM matches
WHERE id LIKE 'TFCMA-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM transfer_history
WHERE id LIKE 'TFCTR-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_calendar
WHERE id LIKE 'TFCA-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_slots
WHERE id LIKE 'TFCAS-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCRT', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM retentions
WHERE id LIKE 'TFCRT-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM rounds
WHERE id LIKE 'TFCR-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCST', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM season_teams
WHERE id LIKE 'TFCST-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM seasonal_player_stats
WHERE id LIKE 'TFCPS-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCFL', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM financial_ledger
WHERE id LIKE 'TFCFL-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAL', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM audit_logs
WHERE id LIKE 'TFCAL-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTT', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM tournament_teams
WHERE id LIKE 'TFCTT-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_rounds
WHERE id LIKE 'TFCKR-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKP', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_pairings
WHERE id LIKE 'TFCKP-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCG', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM groups
WHERE id LIKE 'TFCG-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCSD', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM standings
WHERE id LIKE 'TFCSD-%'
ON CONFLICT (prefix) DO UPDATE SET counter = EXCLUDED.counter;

-- Verify counters
SELECT * FROM id_counters ORDER BY prefix;
