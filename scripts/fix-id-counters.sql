-- Fix ID Counters Script
-- This script recalculates and updates all ID counters based on existing data
-- Only processes IDs that match the TFC pattern (TFCXX-NUMBER)

-- Base Players (TFCP)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCP', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM base_players
WHERE id::TEXT ~ '^TFCP-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Seasons (TFCS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCS', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM seasons
WHERE id::TEXT ~ '^TFCS-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Users (TFCU)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCU', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM users
WHERE id::TEXT ~ '^TFCU-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tournaments (TFCT)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCT', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM tournaments
WHERE id::TEXT ~ '^TFCT-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Teams (TFCM)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCM', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM teams
WHERE id::TEXT ~ '^TFCM-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Matches (TFCMA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCMA', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM matches
WHERE id::TEXT ~ '^TFCMA-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Transfer History (TFCTH)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTH', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM transfer_history
WHERE id::TEXT ~ '^TFCTH-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Calendar (TFCA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCA', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_calendar
WHERE id::TEXT ~ '^TFCA-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Slots (TFCAS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAS', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_slots
WHERE id::TEXT ~ '^TFCAS-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Retentions (TFCR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCR', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM retentions
WHERE id::TEXT ~ '^TFCR-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Season Teams (TFCST)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCST', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM season_teams
WHERE id::TEXT ~ '^TFCST-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Seasonal Player Stats (TFCPS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPS', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM seasonal_player_stats
WHERE id::TEXT ~ '^TFCPS-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Financial Ledger (TFCFL)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCFL', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM financial_ledger
WHERE id::TEXT ~ '^TFCFL-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Audit Logs (TFCAL)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCAL', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM audit_logs
WHERE id::TEXT ~ '^TFCAL-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tournament Teams (TFCTT)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTT', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM tournament_teams
WHERE id::TEXT ~ '^TFCTT-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Knockout Rounds (TFCKR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKR', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_rounds
WHERE id::TEXT ~ '^TFCKR-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Knockout Pairings (TFCKP)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCKP', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM knockout_pairings
WHERE id::TEXT ~ '^TFCKP-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Groups (TFCG)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCG', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM groups
WHERE id::TEXT ~ '^TFCG-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Standings (TFCSD)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCSD', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM standings
WHERE id::TEXT ~ '^TFCSD-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Rounds (TFCRD)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCRD', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM rounds
WHERE id::TEXT ~ '^TFCRD-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Team Round Bids (TFCRB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCRB', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM team_round_bids
WHERE id::TEXT ~ '^TFCRB-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Tiebreakers (TFCTB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTB', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM tiebreakers
WHERE id::TEXT ~ '^TFCTB-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Team Tiebreaker Bids (TFCTTB)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCTTB', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM team_tiebreaker_bids
WHERE id::TEXT ~ '^TFCTTB-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Bulk Round Selections (TFCBRS)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCBRS', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM bulk_round_selections
WHERE id::TEXT ~ '^TFCBRS-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Preview Allocations (TFCPA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPA', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM preview_allocations
WHERE id::TEXT ~ '^TFCPA-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Password Reset Requests (TFCPRR)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCPRR', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM password_reset_requests
WHERE id::TEXT ~ '^TFCPRR-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Auction Settings (TFCASET)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCASET', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM auction_settings
WHERE id::TEXT ~ '^TFCASET-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Bid Audit Log (TFCBA)
INSERT INTO id_counters (prefix, counter, updated_at)
SELECT 'TFCBA', COALESCE(MAX(CAST(SPLIT_PART(id::TEXT, '-', 2) AS INTEGER)), 0), NOW()
FROM bid_audit_log
WHERE id::TEXT ~ '^TFCBA-[0-9]+$'
ON CONFLICT (prefix) DO UPDATE SET 
  counter = EXCLUDED.counter,
  updated_at = NOW();

-- Verify all counters
SELECT prefix, counter, updated_at 
FROM id_counters 
ORDER BY prefix;
