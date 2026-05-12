-- TFC Database Schema Export
-- Generated: 2026-05-12T12:52:01.950Z
-- Database: Neon PostgreSQL
-- 
-- This schema can be used to create a replica database
--

-- Enable UUID extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types first

CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED');

CREATE TYPE "MatchType" AS ENUM ('LEAGUE', 'GROUP_STAGE', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL', 'PLAYOFF');

CREATE TYPE "RoundStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

CREATE TYPE "TournamentStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TYPE "TournamentType" AS ENUM ('LEAGUE_ONLY', 'LEAGUE_PLAYOFF', 'GROUP_KNOCKOUT', 'KNOCKOUT_ONLY');

CREATE TYPE "TransactionType" AS ENUM ('INITIAL_PURSE', 'PLAYER_PURCHASE', 'PLAYER_SALE', 'ADJUSTMENT');

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN', 'TEAM_MANAGER');

-- Create tables

-- Table: _prisma_migrations
CREATE TABLE "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMP WITH TIME ZONE,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMP WITH TIME ZONE,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY ("id")
);

-- Table: auction_calendar
CREATE TABLE "auction_calendar" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "auctionDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "created_by" TEXT,
  "updated_by" TEXT,
  PRIMARY KEY ("id")
);

-- Indexes for auction_calendar
CREATE UNIQUE INDEX "auction_calendar_seasonId_auctionDate_key" ON public.auction_calendar USING btree ("seasonId", "auctionDate");

-- Table: auction_slots
CREATE TABLE "auction_slots" (
  "id" TEXT NOT NULL,
  "auctionCalendarId" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "slotOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for auction_slots
CREATE UNIQUE INDEX "auction_slots_auctionCalendarId_position_key" ON public.auction_slots USING btree ("auctionCalendarId", "position");

-- Table: audit_logs
CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
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
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Indexes for audit_logs
CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);
CREATE INDEX audit_logs_season_id_idx ON public.audit_logs USING btree (season_id);
CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);

-- Table: base_players
CREATE TABLE "base_players" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "player_id" VARCHAR(255),
  PRIMARY KEY ("id")
);

-- Indexes for base_players
CREATE UNIQUE INDEX base_players_player_id_key ON public.base_players USING btree (player_id);

-- Table: bid_audit_log
CREATE TABLE "bid_audit_log" (
  "id" TEXT NOT NULL,
  "round_id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "encrypted_bids" TEXT NOT NULL,
  "timestamp" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for bid_audit_log
CREATE INDEX bid_audit_log_round_id_idx ON public.bid_audit_log USING btree (round_id);
CREATE INDEX bid_audit_log_team_id_idx ON public.bid_audit_log USING btree (team_id);
CREATE INDEX bid_audit_log_timestamp_idx ON public.bid_audit_log USING btree ("timestamp");

-- Table: bulk_round_selections
CREATE TABLE "bulk_round_selections" (
  "id" VARCHAR(50) NOT NULL,
  "round_id" VARCHAR(20) NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "selected_players" TEXT NOT NULL DEFAULT '{}'::text,
  "submitted" BOOLEAN DEFAULT false,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for bulk_round_selections
CREATE INDEX idx_bulk_round_selections_round ON public.bulk_round_selections USING btree (round_id);
CREATE INDEX idx_bulk_round_selections_team ON public.bulk_round_selections USING btree (team_id);
CREATE UNIQUE INDEX unique_bulk_round_team ON public.bulk_round_selections USING btree (round_id, team_id);

-- Table: bulk_tiebreaker_bid_history
CREATE TABLE "bulk_tiebreaker_bid_history" (
  "id" INTEGER NOT NULL DEFAULT nextval('bulk_tiebreaker_bid_history_id_seq'::regclass),
  "tiebreaker_id" INTEGER NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "bid_amount" INTEGER NOT NULL,
  "bid_time" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for bulk_tiebreaker_bid_history
CREATE INDEX idx_bulk_tiebreaker_bid_history_team ON public.bulk_tiebreaker_bid_history USING btree (team_id);
CREATE INDEX idx_bulk_tiebreaker_bid_history_tiebreaker ON public.bulk_tiebreaker_bid_history USING btree (tiebreaker_id);
CREATE INDEX idx_bulk_tiebreaker_bid_history_time ON public.bulk_tiebreaker_bid_history USING btree (bid_time DESC);

-- Table: bulk_tiebreaker_participants
CREATE TABLE "bulk_tiebreaker_participants" (
  "id" INTEGER NOT NULL DEFAULT nextval('bulk_tiebreaker_participants_id_seq'::regclass),
  "tiebreaker_id" INTEGER NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'active'::character varying,
  "current_bid" INTEGER,
  "last_bid_time" TIMESTAMP WITH TIME ZONE,
  "withdrawn_at" TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY ("id")
);

-- Indexes for bulk_tiebreaker_participants
CREATE INDEX idx_bulk_tiebreaker_participants_status ON public.bulk_tiebreaker_participants USING btree (tiebreaker_id, status);
CREATE INDEX idx_bulk_tiebreaker_participants_team ON public.bulk_tiebreaker_participants USING btree (team_id);
CREATE INDEX idx_bulk_tiebreaker_participants_tiebreaker ON public.bulk_tiebreaker_participants USING btree (tiebreaker_id);
CREATE UNIQUE INDEX unique_bulk_tiebreaker_team ON public.bulk_tiebreaker_participants USING btree (tiebreaker_id, team_id);

-- Table: bulk_tiebreakers
CREATE TABLE "bulk_tiebreakers" (
  "id" INTEGER NOT NULL DEFAULT nextval('bulk_tiebreakers_id_seq'::regclass),
  "round_id" VARCHAR(20) NOT NULL,
  "base_player_id" VARCHAR(20) NOT NULL,
  "base_price" INTEGER NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending'::character varying,
  "current_highest_bid" INTEGER,
  "current_highest_team_id" VARCHAR(20),
  "teams_remaining" INTEGER NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE,
  "max_end_time" TIMESTAMP WITH TIME ZONE,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for bulk_tiebreakers
CREATE INDEX idx_bulk_tiebreakers_player ON public.bulk_tiebreakers USING btree (base_player_id);
CREATE INDEX idx_bulk_tiebreakers_round ON public.bulk_tiebreakers USING btree (round_id);
CREATE INDEX idx_bulk_tiebreakers_status ON public.bulk_tiebreakers USING btree (status);

-- Table: financial_ledger
CREATE TABLE "financial_ledger" (
  "id" TEXT NOT NULL,
  "seasonTeamId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "transactionType" "TransactionType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "previousBalance" INTEGER NOT NULL,
  "newBalance" INTEGER NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "playername" TEXT,
  PRIMARY KEY ("id")
);

-- Table: groups
CREATE TABLE "groups" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for groups
CREATE UNIQUE INDEX "groups_tournamentId_name_key" ON public.groups USING btree ("tournamentId", name);

-- Table: id_counters
CREATE TABLE "id_counters" (
  "prefix" VARCHAR(10) NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY ("prefix")
);

-- Table: knockout_pairings
CREATE TABLE "knockout_pairings" (
  "id" TEXT NOT NULL,
  "knockoutRoundId" TEXT NOT NULL,
  "team1Id" TEXT,
  "team2Id" TEXT,
  "winnerId" TEXT,
  "leg1MatchId" TEXT,
  "leg2MatchId" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: knockout_rounds
CREATE TABLE "knockout_rounds" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "roundName" TEXT NOT NULL,
  "roundOrder" INTEGER NOT NULL,
  "legs" INTEGER NOT NULL DEFAULT 1,
  "status" "RoundStatus" NOT NULL DEFAULT 'PENDING'::"RoundStatus",
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for knockout_rounds
CREATE UNIQUE INDEX "knockout_rounds_tournamentId_roundName_key" ON public.knockout_rounds USING btree ("tournamentId", "roundName");

-- Table: matches
CREATE TABLE "matches" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "groupId" TEXT,
  "homeTeamId" TEXT NOT NULL,
  "awayTeamId" TEXT NOT NULL,
  "matchDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "venue" TEXT,
  "round" TEXT,
  "matchType" "MatchType" NOT NULL DEFAULT 'LEAGUE'::"MatchType",
  "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED'::"MatchStatus",
  "homeScore" INTEGER,
  "awayScore" INTEGER,
  "homePenalty" INTEGER,
  "awayPenalty" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Table: preview_allocations
CREATE TABLE "preview_allocations" (
  "id" INTEGER NOT NULL DEFAULT nextval('preview_allocations_id_seq'::regclass),
  "round_id" VARCHAR(20) NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "base_player_id" VARCHAR(20) NOT NULL,
  "player_name" VARCHAR(255) NOT NULL,
  "amount" INTEGER NOT NULL,
  "acquisition_type" VARCHAR(50) NOT NULL,
  "acquisition_notes" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for preview_allocations
CREATE INDEX idx_preview_allocations_player_id ON public.preview_allocations USING btree (base_player_id);
CREATE INDEX idx_preview_allocations_round_id ON public.preview_allocations USING btree (round_id);
CREATE INDEX idx_preview_allocations_team_id ON public.preview_allocations USING btree (team_id);
CREATE UNIQUE INDEX preview_allocations_round_id_base_player_id_key ON public.preview_allocations USING btree (round_id, base_player_id);
CREATE UNIQUE INDEX preview_allocations_round_id_team_id_key ON public.preview_allocations USING btree (round_id, team_id);

-- Table: retentions
CREATE TABLE "retentions" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "basePlayerId" TEXT NOT NULL,
  "retainedFromSeasonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Indexes for retentions
CREATE UNIQUE INDEX "retentions_seasonId_basePlayerId_key" ON public.retentions USING btree ("seasonId", "basePlayerId");

-- Table: rounds
CREATE TABLE "rounds" (
  "id" VARCHAR(20) NOT NULL,
  "season_id" VARCHAR(20) NOT NULL,
  "position" VARCHAR(50),
  "round_number" INTEGER NOT NULL,
  "round_type" VARCHAR(10) NOT NULL,
  "max_bids_per_team" INTEGER,
  "base_price" INTEGER,
  "duration_seconds" INTEGER NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE,
  "end_time" TIMESTAMP WITH TIME ZONE,
  "status" VARCHAR(30) DEFAULT 'draft'::character varying,
  "finalization_mode" VARCHAR(20) DEFAULT 'auto'::character varying,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "finalization_state" JSONB,
  PRIMARY KEY ("id")
);

-- Indexes for rounds
CREATE INDEX idx_rounds_end_time ON public.rounds USING btree (end_time) WHERE ((status)::text = 'active'::text);
CREATE INDEX idx_rounds_round_type ON public.rounds USING btree (round_type);
CREATE INDEX idx_rounds_season_id ON public.rounds USING btree (season_id);
CREATE INDEX idx_rounds_season_status ON public.rounds USING btree (season_id, status);
CREATE INDEX idx_rounds_status ON public.rounds USING btree (status);
CREATE UNIQUE INDEX unique_season_round_number ON public.rounds USING btree (season_id, round_number);

-- Table: season_teams
CREATE TABLE "season_teams" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "currentBudget" INTEGER NOT NULL,
  "finalBudget" INTEGER,
  "trophiesWon" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for season_teams
CREATE UNIQUE INDEX "season_teams_seasonId_teamId_key" ON public.season_teams USING btree ("seasonId", "teamId");

-- Table: seasonal_player_stats
CREATE TABLE "seasonal_player_stats" (
  "id" TEXT NOT NULL,
  "basePlayerId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "realWorldClub" TEXT NOT NULL,
  "overallRating" INTEGER NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
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
  PRIMARY KEY ("id")
);

-- Indexes for seasonal_player_stats
CREATE UNIQUE INDEX "seasonal_player_stats_basePlayerId_seasonId_key" ON public.seasonal_player_stats USING btree ("basePlayerId", "seasonId");

-- Table: seasons
CREATE TABLE "seasons" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startingPurse" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "season_number" INTEGER NOT NULL,
  "defaultMaxBidsPerTeam" INTEGER DEFAULT 10,
  "defaultBasePrice" INTEGER DEFAULT 100000,
  PRIMARY KEY ("id")
);

-- Indexes for seasons
CREATE UNIQUE INDEX seasons_name_key ON public.seasons USING btree (name);
CREATE UNIQUE INDEX seasons_season_number_key ON public.seasons USING btree (season_number);

-- Table: standings
CREATE TABLE "standings" (
  "id" TEXT NOT NULL,
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
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for standings
CREATE UNIQUE INDEX "standings_tournamentId_teamId_groupName_key" ON public.standings USING btree ("tournamentId", "teamId", "groupName");

-- Table: team_round_bids
CREATE TABLE "team_round_bids" (
  "id" VARCHAR(50) NOT NULL,
  "round_id" VARCHAR(20) NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "encrypted_bids" TEXT NOT NULL,
  "submitted" BOOLEAN DEFAULT false,
  "bid_count" INTEGER DEFAULT 0,
  "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "submitted_at" TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY ("id")
);

-- Indexes for team_round_bids
CREATE INDEX idx_team_round_bids_round ON public.team_round_bids USING btree (round_id);
CREATE INDEX idx_team_round_bids_submitted ON public.team_round_bids USING btree (round_id, submitted);
CREATE INDEX idx_team_round_bids_team ON public.team_round_bids USING btree (team_id);
CREATE UNIQUE INDEX unique_round_team ON public.team_round_bids USING btree (round_id, team_id);

-- Table: team_tiebreaker_bids
CREATE TABLE "team_tiebreaker_bids" (
  "id" VARCHAR(50) NOT NULL,
  "tiebreaker_id" VARCHAR(20) NOT NULL,
  "team_id" VARCHAR(20) NOT NULL,
  "old_bid_amount" INTEGER NOT NULL,
  "new_bid_amount" INTEGER,
  "submitted" BOOLEAN DEFAULT false,
  "submitted_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY ("id")
);

-- Indexes for team_tiebreaker_bids
CREATE INDEX idx_team_tiebreaker_bids_submitted ON public.team_tiebreaker_bids USING btree (tiebreaker_id, submitted);
CREATE INDEX idx_team_tiebreaker_bids_team ON public.team_tiebreaker_bids USING btree (team_id);
CREATE INDEX idx_team_tiebreaker_bids_tiebreaker ON public.team_tiebreaker_bids USING btree (tiebreaker_id);
CREATE UNIQUE INDEX unique_tiebreaker_team ON public.team_tiebreaker_bids USING btree (tiebreaker_id, team_id);

-- Table: teams
CREATE TABLE "teams" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "managerName" TEXT NOT NULL,
  "logoUrl" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for teams
CREATE UNIQUE INDEX teams_name_key ON public.teams USING btree (name);

-- Table: tiebreakers
CREATE TABLE "tiebreakers" (
  "id" VARCHAR(20) NOT NULL,
  "round_id" VARCHAR(20) NOT NULL,
  "base_player_id" VARCHAR(20) NOT NULL,
  "original_amount" INTEGER NOT NULL,
  "tied_teams_count" INTEGER NOT NULL,
  "status" VARCHAR(20) DEFAULT 'active'::character varying,
  "winning_team_id" VARCHAR(20),
  "winning_bid" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "resolved_at" TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY ("id")
);

-- Indexes for tiebreakers
CREATE INDEX idx_tiebreakers_player ON public.tiebreakers USING btree (base_player_id);
CREATE INDEX idx_tiebreakers_round ON public.tiebreakers USING btree (round_id);
CREATE INDEX idx_tiebreakers_round_status ON public.tiebreakers USING btree (round_id, status);
CREATE INDEX idx_tiebreakers_status ON public.tiebreakers USING btree (status);

-- Table: tournament_teams
CREATE TABLE "tournament_teams" (
  "id" TEXT NOT NULL,
  "tournament_id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "group_name" TEXT,
  "seed_position" INTEGER,
  "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- Indexes for tournament_teams
CREATE INDEX tournament_teams_team_id_idx ON public.tournament_teams USING btree (team_id);
CREATE INDEX tournament_teams_tournament_id_idx ON public.tournament_teams USING btree (tournament_id);
CREATE UNIQUE INDEX tournament_teams_tournament_id_team_id_key ON public.tournament_teams USING btree (tournament_id, team_id);

-- Table: tournaments
CREATE TABLE "tournaments" (
  "id" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tournamentType" "TournamentType" NOT NULL,
  "startDate" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "endDate" TIMESTAMP WITHOUT TIME ZONE,
  "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING'::"TournamentStatus",
  "description" TEXT,
  "leagueLegs" INTEGER DEFAULT 2,
  "playoffFormat" TEXT,
  "groupLegs" INTEGER DEFAULT 1,
  "groupQualifiers" INTEGER DEFAULT 2,
  "knockoutConfig" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  PRIMARY KEY ("id")
);

-- Indexes for tournaments
CREATE UNIQUE INDEX "tournaments_seasonId_name_key" ON public.tournaments USING btree ("seasonId", name);

-- Table: transfer_history
CREATE TABLE "transfer_history" (
  "id" TEXT NOT NULL,
  "basePlayerId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "soldPrice" INTEGER NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "round_id" VARCHAR(255),
  "acquisition_type" VARCHAR(50) DEFAULT 'bid_won'::character varying,
  "acquisition_notes" TEXT,
  PRIMARY KEY ("id")
);

-- Indexes for transfer_history
CREATE INDEX idx_transfer_history_acquisition_type ON public.transfer_history USING btree (acquisition_type);
CREATE INDEX idx_transfer_history_round_id ON public.transfer_history USING btree (round_id);

-- Table: users
CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'SUB_ADMIN'::"UserRole",
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
  "created_by" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "assigned_seasons" JSONB DEFAULT '[]'::jsonb,
  "team_id" TEXT,
  PRIMARY KEY ("id")
);

-- Indexes for users
CREATE INDEX users_created_by_idx ON public.users USING btree (created_by);
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE INDEX users_is_active_idx ON public.users USING btree (is_active);
CREATE INDEX users_team_id_idx ON public.users USING btree (team_id);

-- Foreign Key Constraints
ALTER TABLE "auction_calendar" ADD CONSTRAINT "auction_calendar_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "auction_slots" ADD CONSTRAINT "auction_slots_auctionCalendarId_fkey" FOREIGN KEY ("auctionCalendarId") REFERENCES "auction_calendar" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "bid_audit_log" ADD CONSTRAINT "bid_audit_log_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_round_selections" ADD CONSTRAINT "fk_bulk_round_selections_round" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_round_selections" ADD CONSTRAINT "fk_bulk_round_selections_team" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreaker_bid_history" ADD CONSTRAINT "fk_bulk_tiebreaker_bid_history_team" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreaker_bid_history" ADD CONSTRAINT "fk_bulk_tiebreaker_bid_history_tiebreaker" FOREIGN KEY ("tiebreaker_id") REFERENCES "bulk_tiebreakers" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreaker_participants" ADD CONSTRAINT "fk_bulk_tiebreaker_participants_team" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreaker_participants" ADD CONSTRAINT "fk_bulk_tiebreaker_participants_tiebreaker" FOREIGN KEY ("tiebreaker_id") REFERENCES "bulk_tiebreakers" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreakers" ADD CONSTRAINT "fk_bulk_tiebreakers_highest_team" FOREIGN KEY ("current_highest_team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE "bulk_tiebreakers" ADD CONSTRAINT "fk_bulk_tiebreakers_player" FOREIGN KEY ("base_player_id") REFERENCES "base_players" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "bulk_tiebreakers" ADD CONSTRAINT "fk_bulk_tiebreakers_round" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "season_teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "groups" ADD CONSTRAINT "groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "knockout_pairings" ADD CONSTRAINT "knockout_pairings_knockoutRoundId_fkey" FOREIGN KEY ("knockoutRoundId") REFERENCES "knockout_rounds" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "knockout_rounds" ADD CONSTRAINT "knockout_rounds_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "season_teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "season_teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "preview_allocations" ADD CONSTRAINT "preview_allocations_base_player_id_fkey" FOREIGN KEY ("base_player_id") REFERENCES "base_players" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "preview_allocations" ADD CONSTRAINT "preview_allocations_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "preview_allocations" ADD CONSTRAINT "preview_allocations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "retentions" ADD CONSTRAINT "retentions_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "retentions" ADD CONSTRAINT "retentions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "rounds" ADD CONSTRAINT "fk_rounds_season" FOREIGN KEY ("season_id") REFERENCES "seasons" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "seasonal_player_stats" ADD CONSTRAINT "seasonal_player_stats_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "seasonal_player_stats" ADD CONSTRAINT "seasonal_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "standings" ADD CONSTRAINT "standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "season_teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "team_round_bids" ADD CONSTRAINT "fk_team_round_bids_round" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "team_round_bids" ADD CONSTRAINT "fk_team_round_bids_team" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "team_tiebreaker_bids" ADD CONSTRAINT "fk_team_tiebreaker_bids_team" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "team_tiebreaker_bids" ADD CONSTRAINT "fk_team_tiebreaker_bids_tiebreaker" FOREIGN KEY ("tiebreaker_id") REFERENCES "tiebreakers" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "tiebreakers" ADD CONSTRAINT "fk_tiebreakers_player" FOREIGN KEY ("base_player_id") REFERENCES "base_players" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "tiebreakers" ADD CONSTRAINT "fk_tiebreakers_round" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
ALTER TABLE "tiebreakers" ADD CONSTRAINT "fk_tiebreakers_winning_team" FOREIGN KEY ("winning_team_id") REFERENCES "teams" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "season_teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "transfer_history" ADD CONSTRAINT "fk_transfer_history_round" FOREIGN KEY ("round_id") REFERENCES "rounds" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;
ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams" ("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- Unique Constraints
ALTER TABLE "bulk_round_selections" ADD CONSTRAINT "unique_bulk_round_team" UNIQUE ("round_id", "team_id");
ALTER TABLE "bulk_tiebreaker_participants" ADD CONSTRAINT "unique_bulk_tiebreaker_team" UNIQUE ("tiebreaker_id", "team_id");
ALTER TABLE "preview_allocations" ADD CONSTRAINT "preview_allocations_round_id_base_player_id_key" UNIQUE ("base_player_id", "round_id");
ALTER TABLE "preview_allocations" ADD CONSTRAINT "preview_allocations_round_id_team_id_key" UNIQUE ("team_id", "round_id");
ALTER TABLE "rounds" ADD CONSTRAINT "unique_season_round_number" UNIQUE ("round_number", "season_id");
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_season_number_key" UNIQUE ("season_number");
ALTER TABLE "team_round_bids" ADD CONSTRAINT "unique_round_team" UNIQUE ("round_id", "team_id");
ALTER TABLE "team_tiebreaker_bids" ADD CONSTRAINT "unique_tiebreaker_team" UNIQUE ("tiebreaker_id", "team_id");
