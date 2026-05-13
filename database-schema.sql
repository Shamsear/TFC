-- ============================================
-- DATABASE SCHEMA EXPORT
-- PostgreSQL Database Schema
-- Generated from Prisma Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING TABLES (CASCADE)
-- ============================================
-- Uncomment the following section if you want to drop all existing tables

/*
DROP TABLE IF EXISTS "preview_allocations" CASCADE;
DROP TABLE IF EXISTS "bid_audit_log" CASCADE;
DROP TABLE IF EXISTS "bulk_tiebreaker_bid_history" CASCADE;
DROP TABLE IF EXISTS "bulk_tiebreaker_participants" CASCADE;
DROP TABLE IF EXISTS "bulk_tiebreakers" CASCADE;
DROP TABLE IF EXISTS "bulk_round_selections" CASCADE;
DROP TABLE IF EXISTS "team_tiebreaker_bids" CASCADE;
DROP TABLE IF EXISTS "tiebreakers" CASCADE;
DROP TABLE IF EXISTS "team_round_bids" CASCADE;
DROP TABLE IF EXISTS "rounds" CASCADE;
DROP TABLE IF EXISTS "auction_slots" CASCADE;
DROP TABLE IF EXISTS "auction_calendar" CASCADE;
DROP TABLE IF EXISTS "standings" CASCADE;
DROP TABLE IF EXISTS "matches" CASCADE;
DROP TABLE IF EXISTS "knockout_pairings" CASCADE;
DROP TABLE IF EXISTS "knockout_rounds" CASCADE;
DROP TABLE IF EXISTS "groups" CASCADE;
DROP TABLE IF EXISTS "tournament_teams" CASCADE;
DROP TABLE IF EXISTS "tournaments" CASCADE;
DROP TABLE IF EXISTS "transfer_history" CASCADE;
DROP TABLE IF EXISTS "seasonal_player_stats" CASCADE;
DROP TABLE IF EXISTS "retentions" CASCADE;
DROP TABLE IF EXISTS "financial_ledger" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "season_teams" CASCADE;
DROP TABLE IF EXISTS "seasons" CASCADE;
DROP TABLE IF EXISTS "teams" CASCADE;
DROP TABLE IF EXISTS "base_players" CASCADE;

DROP TYPE IF EXISTS "RoundStatus" CASCADE;
DROP TYPE IF EXISTS "MatchStatus" CASCADE;
DROP TYPE IF EXISTS "MatchType" CASCADE;
DROP TYPE IF EXISTS "TournamentStatus" CASCADE;
DROP TYPE IF EXISTS "TournamentType" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "TransactionType" CASCADE;
*/

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('INITIAL_PURSE', 'PLAYER_PURCHASE', 'PLAYER_SALE', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN', 'TEAM_MANAGER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentType" AS ENUM ('LEAGUE_ONLY', 'LEAGUE_PLAYOFF', 'GROUP_KNOCKOUT', 'KNOCKOUT_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'GROUP_STAGE', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL', 'PLAYOFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- CORE TABLES
-- ============================================

-- Base Players Table
CREATE TABLE IF NOT EXISTS "base_players" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "player_id" TEXT UNIQUE,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Teams Table
CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "managerName" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Seasons Table
CREATE TABLE IF NOT EXISTS "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season_number" INTEGER NOT NULL UNIQUE,
    "name" TEXT NOT NULL UNIQUE,
    "startingPurse" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "defaultMaxBidsPerTeam" INTEGER DEFAULT 10,
    "defaultBasePrice" INTEGER DEFAULT 100000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Season Teams Table
CREATE TABLE IF NOT EXISTS "season_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "currentBudget" INTEGER NOT NULL,
    "finalBudget" INTEGER,
    "trophiesWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "season_teams_seasonId_teamId_key" UNIQUE ("seasonId", "teamId"),
    CONSTRAINT "season_teams_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE,
    CONSTRAINT "season_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE
);

-- Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SUB_ADMIN',
    "passwordHash" TEXT NOT NULL,
    "team_id" TEXT,
    "created_by" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_seasons" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_name" TEXT,
    "season_id" TEXT,
    "details" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Financial Ledger Table
CREATE TABLE IF NOT EXISTS "financial_ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonTeamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "previousBalance" INTEGER NOT NULL,
    "newBalance" INTEGER NOT NULL,
    "description" TEXT,
    "player_name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_ledger_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE,
    CONSTRAINT "financial_ledger_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE
);

-- Retentions Table
CREATE TABLE IF NOT EXISTS "retentions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "basePlayerId" TEXT NOT NULL,
    "retainedFromSeasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "retentions_seasonId_basePlayerId_key" UNIQUE ("seasonId", "basePlayerId"),
    CONSTRAINT "retentions_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE,
    CONSTRAINT "retentions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Seasonal Player Stats Table
CREATE TABLE IF NOT EXISTS "seasonal_player_stats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "basePlayerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "realWorldClub" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "star_rating" INTEGER,
    "nationality" TEXT,
    "playing_style" TEXT,
    "height" INTEGER,
    "weight" INTEGER,
    "age" INTEGER,
    "foot" TEXT,
    "featured" TEXT,
    "weak_foot_usage" TEXT,
    "weak_foot_accuracy" TEXT,
    "form" TEXT,
    "injury_resistance" TEXT,
    "condition" TEXT,
    "max_level" INTEGER,
    "overall_at_max_level" INTEGER,
    "offensive_awareness" INTEGER,
    "ball_control" INTEGER,
    "dribbling" INTEGER,
    "tight_possession" INTEGER,
    "low_pass" INTEGER,
    "lofted_pass" INTEGER,
    "finishing" INTEGER,
    "heading" INTEGER,
    "set_piece_taking" INTEGER,
    "curl" INTEGER,
    "speed" INTEGER,
    "acceleration" INTEGER,
    "kicking_power" INTEGER,
    "jumping" INTEGER,
    "physical_contact" INTEGER,
    "balance" INTEGER,
    "stamina" INTEGER,
    "defensive_awareness" INTEGER,
    "tackling" INTEGER,
    "aggression" INTEGER,
    "defensive_engagement" INTEGER,
    "gk_awareness" INTEGER,
    "gk_catching" INTEGER,
    "gk_parrying" INTEGER,
    "gk_reflexes" INTEGER,
    "gk_reach" INTEGER,
    "scissors_feint" TEXT,
    "double_touch" TEXT,
    "flip_flap" TEXT,
    "marseille_turn" TEXT,
    "sombrero" TEXT,
    "chop_turn" TEXT,
    "cut_behind_turn" TEXT,
    "scotch_move" TEXT,
    "sole_control" TEXT,
    "momentum_dribbling" TEXT,
    "acceleration_burst" TEXT,
    "magnetic_feet" TEXT,
    "heading_skill" TEXT,
    "bullet_header" TEXT,
    "long_range_curler" TEXT,
    "blitz_curler" TEXT,
    "chip_shot_control" TEXT,
    "knuckle_shot" TEXT,
    "dipping_shot" TEXT,
    "rising_shot" TEXT,
    "long_range_shooting" TEXT,
    "low_screamer" TEXT,
    "acrobatic_finishing" TEXT,
    "heel_trick" TEXT,
    "first_time_shot" TEXT,
    "phenomenal_finishing" TEXT,
    "willpower" TEXT,
    "one_touch_pass" TEXT,
    "through_passing" TEXT,
    "weighted_pass" TEXT,
    "pinpoint_crossing" TEXT,
    "edged_crossing" TEXT,
    "outside_curler" TEXT,
    "rabona" TEXT,
    "no_look_pass" TEXT,
    "game_changing_pass" TEXT,
    "visionary_pass" TEXT,
    "phenomenal_pass" TEXT,
    "low_lofted_pass" TEXT,
    "gk_low_punt" TEXT,
    "gk_high_punt" TEXT,
    "long_throw" TEXT,
    "gk_long_throw" TEXT,
    "penalty_specialist" TEXT,
    "gk_penalty_saver" TEXT,
    "gk_directing_defence" TEXT,
    "gk_spirit_roar" TEXT,
    "gamesmanship" TEXT,
    "man_marking" TEXT,
    "track_back" TEXT,
    "interception" TEXT,
    "blocker" TEXT,
    "aerial_superiority" TEXT,
    "sliding_tackle" TEXT,
    "long_reach_tackle" TEXT,
    "fortress" TEXT,
    "acrobatic_clearance" TEXT,
    "aerial_fort" TEXT,
    "captaincy" TEXT,
    "attack_trigger" TEXT,
    "super_sub" TEXT,
    "fighting_spirit" TEXT,
    "trickster" TEXT,
    "mazing_run" TEXT,
    "speeding_bullet" TEXT,
    "incisive_run" TEXT,
    "long_ball_expert" TEXT,
    "early_cross" TEXT,
    "long_ranger" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seasonal_player_stats_basePlayerId_seasonId_key" UNIQUE ("basePlayerId", "seasonId"),
    CONSTRAINT "seasonal_player_stats_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE,
    CONSTRAINT "seasonal_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Transfer History Table
CREATE TABLE IF NOT EXISTS "transfer_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "basePlayerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "round_id" TEXT,
    "soldPrice" INTEGER NOT NULL,
    "acquisition_type" TEXT NOT NULL DEFAULT 'bid_won',
    "acquisition_notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transfer_history_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE,
    CONSTRAINT "transfer_history_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE,
    CONSTRAINT "transfer_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE,
    CONSTRAINT "transfer_history_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE SET NULL
);

-- ============================================
-- CALENDAR & AUCTION TABLES
-- ============================================

-- Auction Calendar Table
CREATE TABLE IF NOT EXISTS "auction_calendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "auctionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auction_calendar_seasonId_auctionDate_key" UNIQUE ("seasonId", "auctionDate"),
    CONSTRAINT "auction_calendar_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Auction Slots Table
CREATE TABLE IF NOT EXISTS "auction_slots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auctionCalendarId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "slotOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auction_slots_auctionCalendarId_position_key" UNIQUE ("auctionCalendarId", "position"),
    CONSTRAINT "auction_slots_auctionCalendarId_fkey" FOREIGN KEY ("auctionCalendarId") REFERENCES "auction_calendar"("id") ON DELETE CASCADE
);

-- Rounds Table
CREATE TABLE IF NOT EXISTS "rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season_id" TEXT NOT NULL,
    "position" TEXT,
    "round_number" INTEGER NOT NULL,
    "round_type" TEXT NOT NULL,
    "max_bids_per_team" INTEGER,
    "base_price" INTEGER,
    "duration_seconds" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "finalization_mode" TEXT NOT NULL DEFAULT 'auto',
    "finalization_state" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rounds_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Team Round Bids Table
CREATE TABLE IF NOT EXISTS "team_round_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "encrypted_bids" TEXT NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "bid_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    CONSTRAINT "team_round_bids_round_id_team_id_key" UNIQUE ("round_id", "team_id"),
    CONSTRAINT "team_round_bids_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE
);

-- Tiebreakers Table
CREATE TABLE IF NOT EXISTS "tiebreakers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "base_player_id" TEXT NOT NULL,
    "original_amount" INTEGER NOT NULL,
    "tied_teams_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "winning_team_id" TEXT,
    "winning_bid" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tiebreakers_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "tiebreakers_base_player_id_fkey" FOREIGN KEY ("base_player_id") REFERENCES "base_players"("id") ON DELETE CASCADE
);

-- Team Tiebreaker Bids Table
CREATE TABLE IF NOT EXISTS "team_tiebreaker_bids" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tiebreaker_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "old_bid_amount" INTEGER NOT NULL,
    "new_bid_amount" INTEGER,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3),
    CONSTRAINT "team_tiebreaker_bids_tiebreaker_id_team_id_key" UNIQUE ("tiebreaker_id", "team_id"),
    CONSTRAINT "team_tiebreaker_bids_tiebreaker_id_fkey" FOREIGN KEY ("tiebreaker_id") REFERENCES "tiebreakers"("id") ON DELETE CASCADE
);

-- Bulk Round Selections Table
CREATE TABLE IF NOT EXISTS "bulk_round_selections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "selected_players" TEXT NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_round_selections_round_id_team_id_key" UNIQUE ("round_id", "team_id"),
    CONSTRAINT "bulk_round_selections_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE
);

-- Bulk Tiebreakers Table
CREATE TABLE IF NOT EXISTS "bulk_tiebreakers" (
    "id" SERIAL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "base_player_id" TEXT NOT NULL,
    "base_price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "current_highest_bid" INTEGER,
    "current_highest_team_id" TEXT,
    "teams_remaining" INTEGER NOT NULL,
    "start_time" TIMESTAMP(3),
    "max_end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_tiebreakers_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "bulk_tiebreakers_base_player_id_fkey" FOREIGN KEY ("base_player_id") REFERENCES "base_players"("id") ON DELETE CASCADE
);

-- Bulk Tiebreaker Participants Table
CREATE TABLE IF NOT EXISTS "bulk_tiebreaker_participants" (
    "id" SERIAL PRIMARY KEY,
    "tiebreaker_id" INTEGER NOT NULL,
    "team_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "current_bid" INTEGER,
    "last_bid_time" TIMESTAMP(3),
    CONSTRAINT "bulk_tiebreaker_participants_tiebreaker_id_team_id_key" UNIQUE ("tiebreaker_id", "team_id"),
    CONSTRAINT "bulk_tiebreaker_participants_tiebreaker_id_fkey" FOREIGN KEY ("tiebreaker_id") REFERENCES "bulk_tiebreakers"("id") ON DELETE CASCADE,
    CONSTRAINT "bulk_tiebreaker_participants_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

-- Bulk Tiebreaker Bid History Table
CREATE TABLE IF NOT EXISTS "bulk_tiebreaker_bid_history" (
    "id" SERIAL PRIMARY KEY,
    "tiebreaker_id" INTEGER NOT NULL,
    "team_id" TEXT NOT NULL,
    "bid_amount" INTEGER NOT NULL,
    "bid_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bulk_tiebreaker_bid_history_tiebreaker_id_fkey" FOREIGN KEY ("tiebreaker_id") REFERENCES "bulk_tiebreakers"("id") ON DELETE CASCADE,
    CONSTRAINT "bulk_tiebreaker_bid_history_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE
);

-- Bid Audit Log Table
CREATE TABLE IF NOT EXISTS "bid_audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "encrypted_bids" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bid_audit_log_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE
);

-- Preview Allocations Table
CREATE TABLE IF NOT EXISTS "preview_allocations" (
    "id" SERIAL PRIMARY KEY,
    "round_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "base_player_id" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "acquisition_type" TEXT NOT NULL,
    "acquisition_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preview_allocations_round_id_team_id_key" UNIQUE ("round_id", "team_id"),
    CONSTRAINT "preview_allocations_round_id_base_player_id_key" UNIQUE ("round_id", "base_player_id"),
    CONSTRAINT "preview_allocations_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE,
    CONSTRAINT "preview_allocations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
    CONSTRAINT "preview_allocations_base_player_id_fkey" FOREIGN KEY ("base_player_id") REFERENCES "base_players"("id") ON DELETE CASCADE
);

-- ============================================
-- TOURNAMENT TABLES
-- ============================================

-- Tournaments Table
CREATE TABLE IF NOT EXISTS "tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tournamentType" "TournamentType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "description" TEXT,
    "leagueLegs" INTEGER DEFAULT 2,
    "playoffFormat" TEXT,
    "groupLegs" INTEGER DEFAULT 1,
    "groupQualifiers" INTEGER DEFAULT 2,
    "knockoutConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tournaments_seasonId_name_key" UNIQUE ("seasonId", "name"),
    CONSTRAINT "tournaments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);

-- Tournament Teams Table
CREATE TABLE IF NOT EXISTS "tournament_teams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournament_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "group_name" TEXT,
    "seed_position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_teams_tournament_id_team_id_key" UNIQUE ("tournament_id", "team_id"),
    CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE,
    CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "season_teams"("id") ON DELETE CASCADE
);

-- Groups Table
CREATE TABLE IF NOT EXISTS "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "groups_tournamentId_name_key" UNIQUE ("tournamentId", "name"),
    CONSTRAINT "groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
);

-- Knockout Rounds Table
CREATE TABLE IF NOT EXISTS "knockout_rounds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "legs" INTEGER NOT NULL DEFAULT 1,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knockout_rounds_tournamentId_roundName_key" UNIQUE ("tournamentId", "roundName"),
    CONSTRAINT "knockout_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE
);

-- Knockout Pairings Table
CREATE TABLE IF NOT EXISTS "knockout_pairings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knockoutRoundId" TEXT NOT NULL,
    "team1Id" TEXT,
    "team2Id" TEXT,
    "winnerId" TEXT,
    "leg1MatchId" TEXT,
    "leg2MatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "knockout_pairings_knockoutRoundId_fkey" FOREIGN KEY ("knockoutRoundId") REFERENCES "knockout_rounds"("id") ON DELETE CASCADE
);

-- Matches Table
CREATE TABLE IF NOT EXISTS "matches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "round" TEXT,
    "matchType" "MatchType" NOT NULL DEFAULT 'LEAGUE',
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "homePenalty" INTEGER,
    "awayPenalty" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
    CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL,
    CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE,
    CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE
);

-- Standings Table
CREATE TABLE IF NOT EXISTS "standings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupName" TEXT,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goalsFor" INTEGER NOT NULL DEFAULT 0,
    "goalsAgainst" INTEGER NOT NULL DEFAULT 0,
    "goalDiff" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "standings_tournamentId_teamId_groupName_key" UNIQUE ("tournamentId", "teamId", "groupName"),
    CONSTRAINT "standings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE,
    CONSTRAINT "standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "season_teams"("id") ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_season_id_idx" ON "audit_logs"("season_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Transfer History Indexes
CREATE INDEX IF NOT EXISTS "transfer_history_round_id_idx" ON "transfer_history"("round_id");
CREATE INDEX IF NOT EXISTS "idx_transfer_history_acquisition_type" ON "transfer_history"("acquisition_type");

-- Rounds Indexes
CREATE INDEX IF NOT EXISTS "rounds_season_id_idx" ON "rounds"("season_id");
CREATE INDEX IF NOT EXISTS "rounds_status_idx" ON "rounds"("status");
CREATE INDEX IF NOT EXISTS "rounds_end_time_idx" ON "rounds"("end_time");

-- Team Round Bids Indexes
CREATE INDEX IF NOT EXISTS "team_round_bids_round_id_idx" ON "team_round_bids"("round_id");
CREATE INDEX IF NOT EXISTS "team_round_bids_team_id_idx" ON "team_round_bids"("team_id");

-- Tiebreakers Indexes
CREATE INDEX IF NOT EXISTS "tiebreakers_round_id_idx" ON "tiebreakers"("round_id");
CREATE INDEX IF NOT EXISTS "tiebreakers_status_idx" ON "tiebreakers"("status");

-- Team Tiebreaker Bids Indexes
CREATE INDEX IF NOT EXISTS "team_tiebreaker_bids_tiebreaker_id_idx" ON "team_tiebreaker_bids"("tiebreaker_id");
CREATE INDEX IF NOT EXISTS "team_tiebreaker_bids_team_id_idx" ON "team_tiebreaker_bids"("team_id");

-- Bulk Round Selections Indexes
CREATE INDEX IF NOT EXISTS "bulk_round_selections_round_id_idx" ON "bulk_round_selections"("round_id");
CREATE INDEX IF NOT EXISTS "bulk_round_selections_team_id_idx" ON "bulk_round_selections"("team_id");

-- Bulk Tiebreakers Indexes
CREATE INDEX IF NOT EXISTS "bulk_tiebreakers_round_id_idx" ON "bulk_tiebreakers"("round_id");
CREATE INDEX IF NOT EXISTS "bulk_tiebreakers_status_idx" ON "bulk_tiebreakers"("status");

-- Bulk Tiebreaker Participants Indexes
CREATE INDEX IF NOT EXISTS "bulk_tiebreaker_participants_tiebreaker_id_idx" ON "bulk_tiebreaker_participants"("tiebreaker_id");
CREATE INDEX IF NOT EXISTS "bulk_tiebreaker_participants_team_id_idx" ON "bulk_tiebreaker_participants"("team_id");

-- Bulk Tiebreaker Bid History Indexes
CREATE INDEX IF NOT EXISTS "bulk_tiebreaker_bid_history_tiebreaker_id_idx" ON "bulk_tiebreaker_bid_history"("tiebreaker_id");
CREATE INDEX IF NOT EXISTS "bulk_tiebreaker_bid_history_team_id_idx" ON "bulk_tiebreaker_bid_history"("team_id");

-- Bid Audit Log Indexes
CREATE INDEX IF NOT EXISTS "bid_audit_log_round_id_idx" ON "bid_audit_log"("round_id");
CREATE INDEX IF NOT EXISTS "bid_audit_log_team_id_idx" ON "bid_audit_log"("team_id");
CREATE INDEX IF NOT EXISTS "bid_audit_log_timestamp_idx" ON "bid_audit_log"("timestamp");

-- Preview Allocations Indexes
CREATE INDEX IF NOT EXISTS "preview_allocations_round_id_idx" ON "preview_allocations"("round_id");
CREATE INDEX IF NOT EXISTS "preview_allocations_team_id_idx" ON "preview_allocations"("team_id");
CREATE INDEX IF NOT EXISTS "preview_allocations_base_player_id_idx" ON "preview_allocations"("base_player_id");

-- Tournament Teams Indexes
CREATE INDEX IF NOT EXISTS "tournament_teams_tournament_id_idx" ON "tournament_teams"("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_teams_team_id_idx" ON "tournament_teams"("team_id");

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE "base_players" IS 'Core player information shared across seasons';
COMMENT ON TABLE "teams" IS 'Team information and manager details';
COMMENT ON TABLE "seasons" IS 'Season configuration and settings';
COMMENT ON TABLE "season_teams" IS 'Team participation in specific seasons with budget tracking';
COMMENT ON TABLE "users" IS 'User accounts with role-based access control';
COMMENT ON TABLE "audit_logs" IS 'Audit trail for all user actions';
COMMENT ON TABLE "financial_ledger" IS 'Financial transaction history for teams';
COMMENT ON TABLE "retentions" IS 'Player retention records across seasons';
COMMENT ON TABLE "seasonal_player_stats" IS 'Detailed player statistics and skills for each season';
COMMENT ON TABLE "transfer_history" IS 'Player acquisition history including auction results';
COMMENT ON TABLE "auction_calendar" IS 'Scheduled auction dates';
COMMENT ON TABLE "auction_slots" IS 'Position-based auction slots';
COMMENT ON TABLE "rounds" IS 'Auction rounds with configuration and status';
COMMENT ON TABLE "team_round_bids" IS 'Encrypted bids submitted by teams for auction rounds';
COMMENT ON TABLE "tiebreakers" IS 'Tiebreaker auctions for tied bids';
COMMENT ON TABLE "team_tiebreaker_bids" IS 'Team bids in tiebreaker auctions';
COMMENT ON TABLE "bulk_round_selections" IS 'Team player selections for bulk rounds';
COMMENT ON TABLE "bulk_tiebreakers" IS 'Live tiebreaker auctions for bulk rounds';
COMMENT ON TABLE "bulk_tiebreaker_participants" IS 'Teams participating in bulk tiebreakers';
COMMENT ON TABLE "bulk_tiebreaker_bid_history" IS 'Bid history for bulk tiebreakers';
COMMENT ON TABLE "bid_audit_log" IS 'Audit trail for all bid operations';
COMMENT ON TABLE "preview_allocations" IS 'Preview of player allocations before finalization';
COMMENT ON TABLE "tournaments" IS 'Tournament configuration and settings';
COMMENT ON TABLE "tournament_teams" IS 'Teams participating in tournaments';
COMMENT ON TABLE "groups" IS 'Tournament groups for group stage';
COMMENT ON TABLE "knockout_rounds" IS 'Knockout round configuration';
COMMENT ON TABLE "knockout_pairings" IS 'Team pairings in knockout rounds';
COMMENT ON TABLE "matches" IS 'Match fixtures and results';
COMMENT ON TABLE "standings" IS 'Tournament standings and statistics';

-- ============================================
-- END OF SCHEMA
-- ============================================


