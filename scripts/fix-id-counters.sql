-- Fix ID Counters Script
-- This script recalculates and updates all ID counters based on existing data

-- Base Players (TFCP)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCP', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM base_players
WHERE id LIKE 'TFCP-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Seasons (TFCS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM seasons
WHERE id LIKE 'TFCS-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Users (TFCU)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCU', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM users
WHERE id LIKE 'TFCU-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tournaments (TFCT)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCT', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM tournaments
WHERE id LIKE 'TFCT-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Teams (TFCM)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCM', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM teams
WHERE id LIKE 'TFCM-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Matches (TFCMA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCMA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM matches
WHERE id LIKE 'TFCMA-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Transfer History (TFCTH)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTH', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM transfer_history
WHERE id LIKE 'TFCTH-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Calendar (TFCA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_calendar
WHERE id LIKE 'TFCA-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Slots (TFCAS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_slots
WHERE id LIKE 'TFCAS-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Retentions (TFCR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM retentions
WHERE id LIKE 'TFCR-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Season Teams (TFCST)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCST', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM season_teams
WHERE id LIKE 'TFCST-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Seasonal Player Stats (TFCPS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM seasonal_player_stats
WHERE id LIKE 'TFCPS-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Financial Ledger (TFCFL)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCFL', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM financial_ledger
WHERE id LIKE 'TFCFL-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Audit Logs (TFCAL)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAL', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM audit_logs
WHERE id LIKE 'TFCAL-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tournament Teams (TFCTT)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTT', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM tournament_teams
WHERE id LIKE 'TFCTT-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Knockout Rounds (TFCKR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_rounds
WHERE id LIKE 'TFCKR-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Knockout Pairings (TFCKP)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKP', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_pairings
WHERE id LIKE 'TFCKP-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Groups (TFCG)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCG', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM groups
WHERE id LIKE 'TFCG-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Standings (TFCSD)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCSD', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM standings
WHERE id LIKE 'TFCSD-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Rounds (TFCRD)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCRD', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM rounds
WHERE id LIKE 'TFCRD-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Team Round Bids (TFCRB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCRB', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM team_round_bids
WHERE id LIKE 'TFCRB-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tiebreakers (TFCTB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTB', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM tiebreakers
WHERE id LIKE 'TFCTB-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Team Tiebreaker Bids (TFCTTB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTTB', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM team_tiebreaker_bids
WHERE id LIKE 'TFCTTB-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Bulk Round Selections (TFCBRS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCBRS', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM bulk_round_selections
WHERE id LIKE 'TFCBRS-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Preview Allocations (TFCPA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM preview_allocations
WHERE id LIKE 'TFCPA-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Password Reset Requests (TFCPRR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPRR', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM password_reset_requests
WHERE id LIKE 'TFCPRR-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Settings (TFCASET)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCASET', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_settings
WHERE id LIKE 'TFCASET-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Bid Audit Log (TFCBA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCBA', COALESCE(MAX(CAST(SPLIT_PART(id, '-', 2) AS INTEGER)), 0), NOW()
FROM bid_audit_log
WHERE id LIKE 'TFCBA-%'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Verify all counters
SELECT prefix, counter, updated_at 
FROM id_counters 
ORDER BY prefix;
