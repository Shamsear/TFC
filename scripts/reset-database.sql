-- ============================================
-- TFC Database Reset Script
-- Deletes all data and creates Super Admin
-- ============================================

-- Step 1: Delete all data (respecting foreign key constraints)
-- Delete in reverse dependency order

DELETE FROM "retentions";
DELETE FROM "auction_slots";
DELETE FROM "auction_calendar";
DELETE FROM "financial_ledger";
DELETE FROM "transfer_history";
DELETE FROM "seasonal_player_stats";
DELETE FROM "base_players";
DELETE FROM "standings";
DELETE FROM "knockout_pairings";
DELETE FROM "knockout_rounds";
DELETE FROM "tournament_teams";
DELETE FROM "matches";
DELETE FROM "groups";
DELETE FROM "tournaments";
DELETE FROM "season_teams";
DELETE FROM "seasons";
DELETE FROM "teams";
DELETE FROM "audit_logs";
DELETE FROM "users";

-- Step 2: Reset sequences (if using auto-increment - not needed for manual IDs)
-- Not applicable since we're using custom IDs

-- Step 3: Create Super Admin with clean ID
-- Password: admin123 (bcrypt hash)
INSERT INTO "users" (
  "id",
  "email",
  "name",
  "role",
  "passwordHash",
  "isActive",
  "assignedSeasons",
  "createdAt",
  "updatedAt"
) VALUES (
  'TFCU-1',
  'admin@tfc.com',
  'Super Admin',
  'SUPER_ADMIN',
  '$2a$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash
  true,
  '[]',
  NOW(),
  NOW()
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check if all tables are empty
SELECT 'base_players' as table_name, COUNT(*) as count FROM "base_players"
UNION ALL
SELECT 'seasons', COUNT(*) FROM "seasons"
UNION ALL
SELECT 'users', COUNT(*) FROM "users"
UNION ALL
SELECT 'teams', COUNT(*) FROM "teams"
UNION ALL
SELECT 'tournaments', COUNT(*) FROM "tournaments"
UNION ALL
SELECT 'matches', COUNT(*) FROM "matches"
UNION ALL
SELECT 'transfer_history', COUNT(*) FROM "transfer_history"
UNION ALL
SELECT 'auction_calendar', COUNT(*) FROM "auction_calendar"
UNION ALL
SELECT 'season_teams', COUNT(*) FROM "season_teams"
UNION ALL
SELECT 'seasonal_player_stats', COUNT(*) FROM "seasonal_player_stats"
UNION ALL
SELECT 'financial_ledger', COUNT(*) FROM "financial_ledger"
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM "audit_logs";

-- Verify Super Admin was created
SELECT * FROM "users" WHERE "id" = 'TFCU-1';
