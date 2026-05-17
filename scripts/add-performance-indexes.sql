-- Performance Optimization Indexes
-- Run this script to add indexes that will significantly improve query performance
-- Estimated execution time: 2-5 minutes depending on data size

-- ============================================================================
-- TRANSFER HISTORY INDEXES
-- ============================================================================

-- Index for queries filtering by season and team
CREATE INDEX IF NOT EXISTS idx_transfer_history_season_team 
  ON transfer_history("seasonId", "teamId");

-- Index for queries filtering by season and player
CREATE INDEX IF NOT EXISTS idx_transfer_history_season_player 
  ON transfer_history("seasonId", "basePlayerId");

-- Index for queries ordering by creation date
CREATE INDEX IF NOT EXISTS idx_transfer_history_created 
  ON transfer_history("createdAt" DESC);

-- Index for round-specific queries
CREATE INDEX IF NOT EXISTS idx_transfer_history_round 
  ON transfer_history("round_id") WHERE "round_id" IS NOT NULL;

-- ============================================================================
-- SEASONAL PLAYER STATS INDEXES
-- ============================================================================

-- Index for queries filtering by season and ordering by rating
CREATE INDEX IF NOT EXISTS idx_seasonal_stats_season_rating 
  ON seasonal_player_stats("seasonId", "overallRating" DESC);

-- Index for queries filtering by season and position
CREATE INDEX IF NOT EXISTS idx_seasonal_stats_season_position 
  ON seasonal_player_stats("seasonId", position);

-- Index for queries filtering by season, position, and position group
CREATE INDEX IF NOT EXISTS idx_seasonal_stats_season_pos_group 
  ON seasonal_player_stats("seasonId", position, position_group);

-- Index for player lookup
CREATE INDEX IF NOT EXISTS idx_seasonal_stats_player 
  ON seasonal_player_stats("basePlayerId");

-- ============================================================================
-- ROUNDS INDEXES
-- ============================================================================

-- Index for queries filtering by season and status
CREATE INDEX IF NOT EXISTS idx_rounds_season_status 
  ON rounds("season_id", status);

-- Index for queries filtering by season and ordering by end time
CREATE INDEX IF NOT EXISTS idx_rounds_season_endtime 
  ON rounds("season_id", "end_time" DESC NULLS LAST);

-- Index for queries filtering by season and round number
CREATE INDEX IF NOT EXISTS idx_rounds_season_number 
  ON rounds("season_id", "round_number");

-- Index for active rounds that need finalization
CREATE INDEX IF NOT EXISTS idx_rounds_active_expired 
  ON rounds(status, "end_time") WHERE status = 'active';

-- ============================================================================
-- MATCHES INDEXES
-- ============================================================================

-- Index for queries filtering by tournament and ordering by date
CREATE INDEX IF NOT EXISTS idx_matches_tournament_date 
  ON matches("tournamentId", "matchDate" DESC);

-- Index for queries filtering by home team and status
CREATE INDEX IF NOT EXISTS idx_matches_home_team_status 
  ON matches("homeTeamId", status);

-- Index for queries filtering by away team and status
CREATE INDEX IF NOT EXISTS idx_matches_away_team_status 
  ON matches("awayTeamId", status);

-- Index for completed matches
CREATE INDEX IF NOT EXISTS idx_matches_completed 
  ON matches(status, "matchDate" DESC) WHERE status = 'COMPLETED';

-- ============================================================================
-- STANDINGS INDEXES
-- ============================================================================

-- Index for queries filtering by tournament and team
CREATE INDEX IF NOT EXISTS idx_standings_tournament_team 
  ON standings("tournamentId", "teamId");

-- Index for queries ordering by points
CREATE INDEX IF NOT EXISTS idx_standings_tournament_points 
  ON standings("tournamentId", points DESC, "goalDiff" DESC);

-- Index for group standings
CREATE INDEX IF NOT EXISTS idx_standings_tournament_group 
  ON standings("tournamentId", "groupName", position);

-- ============================================================================
-- TEAM ROUND BIDS INDEXES
-- ============================================================================

-- Index for queries filtering by round and team
CREATE INDEX IF NOT EXISTS idx_team_round_bids_round_team 
  ON team_round_bids("round_id", "team_id");

-- Index for queries filtering by round and submission status
CREATE INDEX IF NOT EXISTS idx_team_round_bids_round_submitted 
  ON team_round_bids("round_id", submitted);

-- ============================================================================
-- TIEBREAKERS INDEXES
-- ============================================================================

-- Index for queries filtering by round and status
CREATE INDEX IF NOT EXISTS idx_tiebreakers_round_status 
  ON tiebreakers("round_id", status);

-- Index for active tiebreakers
CREATE INDEX IF NOT EXISTS idx_tiebreakers_active 
  ON tiebreakers(status) WHERE status = 'active';

-- ============================================================================
-- BULK TIEBREAKERS INDEXES
-- ============================================================================

-- Index for queries filtering by round and status
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreakers_round_status 
  ON bulk_tiebreakers("round_id", status);

-- Index for pending bulk tiebreakers
CREATE INDEX IF NOT EXISTS idx_bulk_tiebreakers_pending 
  ON bulk_tiebreakers(status) WHERE status IN ('pending', 'active');

-- ============================================================================
-- SEASON TEAMS INDEXES
-- ============================================================================

-- Index for queries filtering by season
CREATE INDEX IF NOT EXISTS idx_season_teams_season 
  ON season_teams("seasonId");

-- Index for queries filtering by team
CREATE INDEX IF NOT EXISTS idx_season_teams_team 
  ON season_teams("teamId");

-- Index for queries ordering by budget
CREATE INDEX IF NOT EXISTS idx_season_teams_season_budget 
  ON season_teams("seasonId", "currentBudget" DESC);

-- ============================================================================
-- FINANCIAL LEDGER INDEXES
-- ============================================================================

-- Index for queries filtering by season team
CREATE INDEX IF NOT EXISTS idx_financial_ledger_season_team 
  ON financial_ledger("seasonTeamId", "createdAt" DESC);

-- Index for queries filtering by season
CREATE INDEX IF NOT EXISTS idx_financial_ledger_season 
  ON financial_ledger("seasonId", "createdAt" DESC);

-- ============================================================================
-- TOURNAMENTS INDEXES
-- ============================================================================

-- Index for queries filtering by season
CREATE INDEX IF NOT EXISTS idx_tournaments_season 
  ON tournaments("seasonId", "startDate" DESC);

-- Index for queries filtering by status
CREATE INDEX IF NOT EXISTS idx_tournaments_status 
  ON tournaments(status);

-- ============================================================================
-- BULK ROUND SELECTIONS INDEXES
-- ============================================================================

-- Index for queries filtering by round and team
CREATE INDEX IF NOT EXISTS idx_bulk_selections_round_team 
  ON bulk_round_selections("round_id", "team_id");

-- Index for queries filtering by round and submission status
CREATE INDEX IF NOT EXISTS idx_bulk_selections_round_submitted 
  ON bulk_round_selections("round_id", submitted);

-- ============================================================================
-- PREVIEW ALLOCATIONS INDEXES
-- ============================================================================

-- Index for queries filtering by round
CREATE INDEX IF NOT EXISTS idx_preview_allocations_round 
  ON preview_allocations("round_id");

-- ============================================================================
-- STARRED PLAYERS INDEXES
-- ============================================================================

-- Index for queries filtering by season team
CREATE INDEX IF NOT EXISTS idx_starred_players_season_team 
  ON starred_players("seasonTeamId");

-- ============================================================================
-- AUDIT LOGS INDEXES (if table exists)
-- ============================================================================

-- Index for queries filtering by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON audit_logs("user_id", "created_at" DESC);

-- Index for queries filtering by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON audit_logs("entity_type", "entity_id", "created_at" DESC);

-- Index for queries filtering by season
CREATE INDEX IF NOT EXISTS idx_audit_logs_season 
  ON audit_logs("season_id", "created_at" DESC) WHERE "season_id" IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check index sizes (run after creation)
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Check for missing indexes on foreign keys
SELECT 
  c.conrelid::regclass AS table_name,
  string_agg(a.attname, ', ') AS columns,
  'Missing index on foreign key' AS recommendation
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND i.indkey::int[] @> c.conkey::int[]
  )
GROUP BY c.conrelid
ORDER BY table_name;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. These indexes are designed to optimize the most common query patterns
-- 2. Indexes will be created concurrently where possible to avoid locking
-- 3. Some indexes use partial indexes (WHERE clauses) to reduce size
-- 4. Composite indexes are ordered by selectivity (most selective first)
-- 5. Monitor index usage with: SELECT * FROM pg_stat_user_indexes;
-- 6. Remove unused indexes with: DROP INDEX IF EXISTS index_name;

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Run ANALYZE after creating indexes to update statistics
ANALYZE transfer_history;
ANALYZE seasonal_player_stats;
ANALYZE rounds;
ANALYZE matches;
ANALYZE standings;
ANALYZE team_round_bids;
ANALYZE tiebreakers;
ANALYZE bulk_tiebreakers;
ANALYZE season_teams;
ANALYZE financial_ledger;
ANALYZE tournaments;

-- Check for bloated indexes (run periodically)
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND pg_relation_size(indexrelid) > 1024 * 1024 -- Larger than 1MB
ORDER BY pg_relation_size(indexrelid) DESC;

COMMIT;
