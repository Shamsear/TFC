-- TFC Database Schema - Clean Import Version
-- Generated: 2026-05-09
-- Use this for creating a fresh database replica
--
-- IMPORTANT: Run this on an EMPTY database
-- If the database has existing data, drop it first:
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types first
DO $$ BEGIN
  CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'GROUP_STAGE', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL', 'PLAYOFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TournamentType" AS ENUM ('LEAGUE_ONLY', 'LEAGUE_PLAYOFF', 'GROUP_KNOCKOUT', 'KNOCKOUT_ONLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

-- Create tables (in order to respect foreign keys)

-- 1. Independent tables (no foreign keys)
CREATE TABLE IF NOT EXISTS "seasons" (
  "id" TEXT PRIMARY KEY,
  "season_number" INTEGER NOT NULL UNIQUE,
  "name" TEXT NOT NULL UNIQUE,
  "startingPurse" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "teams" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "managerName" TEXT NOT NULL,
  "logoUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "base_players" (
  "id" TEXT PRIMARY KEY,
  "player_id" VARCHAR(255) UNIQUE,
  "name" TEXT NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

-- 2. Tables with one level of foreign keys
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'SUB_ADMIN',
  "passwordHash" TEXT NOT NULL,
  "team_id" TEXT REFERENCES "teams"("id") ON DELETE SET NULL,
  "created_by" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "assigned_seasons" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_team_id_idx" ON "users"("team_id");
CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "users"("created_by");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active");

CREATE TABLE IF NOT EXISTS "season_teams" (
  "id" TEXT PRIMARY KEY,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "teamId" TEXT NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "currentBudget" INTEGER NOT NULL,
  "finalBudget" INTEGER,
  "trophiesWon" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("seasonId", "teamId")
);

CREATE TABLE IF NOT EXISTS "tournaments" (
  "id" TEXT PRIMARY KEY,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "tournamentType" "TournamentType" NOT NULL,
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP,
  "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
  "description" TEXT,
  "leagueLegs" INTEGER DEFAULT 2,
  "playoffFormat" TEXT,
  "groupLegs" INTEGER DEFAULT 1,
  "groupQualifiers" INTEGER DEFAULT 2,
  "knockoutConfig" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("seasonId", "name")
);

CREATE TABLE IF NOT EXISTS "auction_calendar" (
  "id" TEXT PRIMARY KEY,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "auctionDate" TIMESTAMP NOT NULL,
  "description" TEXT,
  "created_by" TEXT,
  "updated_by" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("seasonId", "auctionDate")
);

CREATE TABLE IF NOT EXISTS "retentions" (
  "id" TEXT PRIMARY KEY,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "basePlayerId" TEXT NOT NULL REFERENCES "base_players"("id") ON DELETE CASCADE,
  "retainedFromSeasonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("seasonId", "basePlayerId")
);

CREATE TABLE IF NOT EXISTS "seasonal_player_stats" (
  "id" TEXT PRIMARY KEY,
  "basePlayerId" TEXT NOT NULL REFERENCES "base_players"("id") ON DELETE CASCADE,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "position" TEXT NOT NULL,
  "realWorldClub" TEXT NOT NULL,
  "overallRating" INTEGER NOT NULL,
  "acceleration" INTEGER,
  "aggression" INTEGER,
  "balance" INTEGER,
  "ball_control" INTEGER,
  "curl" INTEGER,
  "defensive_awareness" INTEGER,
  "defensive_engagement" INTEGER,
  "dribbling" INTEGER,
  "finishing" INTEGER,
  "gk_awareness" INTEGER,
  "gk_catching" INTEGER,
  "gk_parrying" INTEGER,
  "gk_reach" INTEGER,
  "gk_reflexes" INTEGER,
  "heading" INTEGER,
  "jumping" INTEGER,
  "kicking_power" INTEGER,
  "lofted_pass" INTEGER,
  "low_pass" INTEGER,
  "nationality" TEXT,
  "offensive_awareness" INTEGER,
  "physical_contact" INTEGER,
  "playing_style" TEXT,
  "set_piece_taking" INTEGER,
  "speed" INTEGER,
  "stamina" INTEGER,
  "star_rating" INTEGER,
  "tackling" INTEGER,
  "tight_possession" INTEGER,
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
  -- Skills (all TEXT fields)
  "scissors_feint" TEXT, "double_touch" TEXT, "flip_flap" TEXT, "marseille_turn" TEXT,
  "sombrero" TEXT, "chop_turn" TEXT, "cut_behind_turn" TEXT, "scotch_move" TEXT,
  "sole_control" TEXT, "momentum_dribbling" TEXT, "acceleration_burst" TEXT, "magnetic_feet" TEXT,
  "heading_skill" TEXT, "bullet_header" TEXT, "long_range_curler" TEXT, "blitz_curler" TEXT,
  "chip_shot_control" TEXT, "knuckle_shot" TEXT, "dipping_shot" TEXT, "rising_shot" TEXT,
  "long_range_shooting" TEXT, "low_screamer" TEXT, "acrobatic_finishing" TEXT, "heel_trick" TEXT,
  "first_time_shot" TEXT, "phenomenal_finishing" TEXT, "willpower" TEXT, "one_touch_pass" TEXT,
  "through_passing" TEXT, "weighted_pass" TEXT, "pinpoint_crossing" TEXT, "edged_crossing" TEXT,
  "outside_curler" TEXT, "rabona" TEXT, "no_look_pass" TEXT, "game_changing_pass" TEXT,
  "visionary_pass" TEXT, "phenomenal_pass" TEXT, "low_lofted_pass" TEXT, "gk_low_punt" TEXT,
  "gk_high_punt" TEXT, "long_throw" TEXT, "gk_long_throw" TEXT, "penalty_specialist" TEXT,
  "gk_penalty_saver" TEXT, "gk_directing_defence" TEXT, "gk_spirit_roar" TEXT, "gamesmanship" TEXT,
  "man_marking" TEXT, "track_back" TEXT, "interception" TEXT, "blocker" TEXT,
  "aerial_superiority" TEXT, "sliding_tackle" TEXT, "long_reach_tackle" TEXT, "fortress" TEXT,
  "acrobatic_clearance" TEXT, "aerial_fort" TEXT, "captaincy" TEXT, "attack_trigger" TEXT,
  "super_sub" TEXT, "fighting_spirit" TEXT, "trickster" TEXT, "mazing_run" TEXT,
  "speeding_bullet" TEXT, "incisive_run" TEXT, "long_ball_expert" TEXT, "early_cross" TEXT,
  "long_ranger" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("basePlayerId", "seasonId")
);

CREATE TABLE IF NOT EXISTS "transfer_history" (
  "id" TEXT PRIMARY KEY,
  "basePlayerId" TEXT NOT NULL REFERENCES "base_players"("id") ON DELETE CASCADE,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "teamId" TEXT NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "soldPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
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
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_season_id_idx" ON "audit_logs"("season_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- 3. Tables with two levels of foreign keys
CREATE TABLE IF NOT EXISTS "financial_ledger" (
  "id" TEXT PRIMARY KEY,
  "seasonTeamId" TEXT NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
  "seasonId" TEXT NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "transactionType" "TransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "previousBalance" INTEGER NOT NULL,
  "newBalance" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "groups" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "groupOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("tournamentId", "name")
);

CREATE TABLE IF NOT EXISTS "knockout_rounds" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "roundName" TEXT NOT NULL,
  "roundOrder" INTEGER NOT NULL,
  "legs" INTEGER NOT NULL DEFAULT 1,
  "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("tournamentId", "roundName")
);

CREATE TABLE IF NOT EXISTS "matches" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "groupId" TEXT REFERENCES "groups"("id") ON DELETE SET NULL,
  "homeTeamId" TEXT NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
  "awayTeamId" TEXT NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
  "matchDate" TIMESTAMP NOT NULL,
  "venue" TEXT,
  "round" TEXT,
  "matchType" "MatchType" NOT NULL DEFAULT 'LEAGUE',
  "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "homePenalty" INTEGER,
  "awayPenalty" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS "standings" (
  "id" TEXT PRIMARY KEY,
  "tournamentId" TEXT NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "teamId" TEXT NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
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
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("tournamentId", "teamId", "groupName")
);

CREATE TABLE IF NOT EXISTS "tournament_teams" (
  "id" TEXT PRIMARY KEY,
  "tournament_id" TEXT NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "team_id" TEXT NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
  "group_name" TEXT,
  "seed_position" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tournament_id", "team_id")
);

CREATE INDEX IF NOT EXISTS "tournament_teams_tournament_id_idx" ON "tournament_teams"("tournament_id");
CREATE INDEX IF NOT EXISTS "tournament_teams_team_id_idx" ON "tournament_teams"("team_id");

CREATE TABLE IF NOT EXISTS "auction_slots" (
  "id" TEXT PRIMARY KEY,
  "auctionCalendarId" TEXT NOT NULL REFERENCES "auction_calendar"("id") ON DELETE CASCADE,
  "position" TEXT NOT NULL,
  "slotOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  UNIQUE("auctionCalendarId", "position")
);

CREATE TABLE IF NOT EXISTS "knockout_pairings" (
  "id" TEXT PRIMARY KEY,
  "knockoutRoundId" TEXT NOT NULL REFERENCES "knockout_rounds"("id") ON DELETE CASCADE,
  "team1Id" TEXT,
  "team2Id" TEXT,
  "winnerId" TEXT,
  "leg1MatchId" TEXT,
  "leg2MatchId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

-- Prisma migrations table
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMP WITH TIME ZONE,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMP WITH TIME ZONE,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- Done!
-- You can now run: npx prisma generate
-- And update your .env with the new DATABASE_URL
