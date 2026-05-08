-- Turf Cats Database Setup Script
-- Run this in your Neon SQL Editor

-- Create ENUM types
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN');
CREATE TYPE "TransactionType" AS ENUM ('INITIAL_PURSE', 'PLAYER_PURCHASE', 'PLAYER_SALE', 'ADJUSTMENT');

-- Create users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'SUB_ADMIN',
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create teams table
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "managerName" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- Create seasons table
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startingPurse" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- Create season_teams table
CREATE TABLE "season_teams" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "currentBudget" INTEGER NOT NULL,
    "finalBudget" INTEGER,
    "trophiesWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_teams_pkey" PRIMARY KEY ("id")
);

-- Create base_players table
CREATE TABLE "base_players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "base_players_pkey" PRIMARY KEY ("id")
);

-- Create seasonal_player_stats table
CREATE TABLE "seasonal_player_stats" (
    "id" TEXT NOT NULL,
    "basePlayerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "realWorldClub" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasonal_player_stats_pkey" PRIMARY KEY ("id")
);

-- Create transfer_history table
CREATE TABLE "transfer_history" (
    "id" TEXT NOT NULL,
    "basePlayerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "soldPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_history_pkey" PRIMARY KEY ("id")
);

-- Create financial_ledger table
CREATE TABLE "financial_ledger" (
    "id" TEXT NOT NULL,
    "seasonTeamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "transactionType" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "previousBalance" INTEGER NOT NULL,
    "newBalance" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_ledger_pkey" PRIMARY KEY ("id")
);

-- Create retentions table
CREATE TABLE "retentions" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "basePlayerId" TEXT NOT NULL,
    "retainedFromSeasonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retentions_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");
CREATE UNIQUE INDEX "seasons_name_key" ON "seasons"("name");
CREATE UNIQUE INDEX "season_teams_seasonId_teamId_key" ON "season_teams"("seasonId", "teamId");
CREATE UNIQUE INDEX "seasonal_player_stats_basePlayerId_seasonId_key" ON "seasonal_player_stats"("basePlayerId", "seasonId");
CREATE UNIQUE INDEX "retentions_seasonId_basePlayerId_key" ON "retentions"("seasonId", "basePlayerId");

-- Add foreign key constraints
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "season_teams" ADD CONSTRAINT "season_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "seasonal_player_stats" ADD CONSTRAINT "seasonal_player_stats_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seasonal_player_stats" ADD CONSTRAINT "seasonal_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transfer_history" ADD CONSTRAINT "transfer_history_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_ledger" ADD CONSTRAINT "financial_ledger_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "retentions" ADD CONSTRAINT "retentions_basePlayerId_fkey" FOREIGN KEY ("basePlayerId") REFERENCES "base_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retentions" ADD CONSTRAINT "retentions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert admin users
-- Password for both: superadmin123 and subadmin123 (hashed with bcrypt, cost 12)
INSERT INTO "users" ("id", "email", "name", "role", "passwordHash", "createdAt", "updatedAt") VALUES
('cm7x1a2b3c4d5e6f7g8h9i0j1', 'superadmin@turfcats.com', 'Super Admin', 'SUPER_ADMIN', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHK.5W', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('cm7x2b3c4d5e6f7g8h9i0j1k2', 'subadmin@turfcats.com', 'Sub Admin', 'SUB_ADMIN', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWEHK.5W', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Success message
SELECT 'Database setup completed successfully!' AS status;
SELECT 'Super Admin: superadmin@turfcats.com / superadmin123' AS credentials;
SELECT 'Sub Admin: subadmin@turfcats.com / subadmin123' AS credentials;
