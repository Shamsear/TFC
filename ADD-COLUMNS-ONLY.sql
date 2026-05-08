-- Add new columns to existing tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS "leagueLegs" INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS "playoffFormat" TEXT,
ADD COLUMN IF NOT EXISTS "groupLegs" INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS "groupQualifiers" INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS "knockoutConfig" TEXT;

-- Create knockout_rounds table if it doesn't exist
CREATE TABLE IF NOT EXISTS "knockout_rounds" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "legs" INTEGER NOT NULL DEFAULT 1,
    "status" "RoundStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knockout_rounds_pkey" PRIMARY KEY ("id")
);

-- Create knockout_pairings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "knockout_pairings" (
    "id" TEXT NOT NULL,
    "knockoutRoundId" TEXT NOT NULL,
    "team1Id" TEXT,
    "team2Id" TEXT,
    "winnerId" TEXT,
    "leg1MatchId" TEXT,
    "leg2MatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knockout_pairings_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for knockout tables
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'knockout_rounds_tournamentId_fkey'
    ) THEN
        ALTER TABLE "knockout_rounds" 
        ADD CONSTRAINT "knockout_rounds_tournamentId_fkey" 
        FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'knockout_pairings_knockoutRoundId_fkey'
    ) THEN
        ALTER TABLE "knockout_pairings" 
        ADD CONSTRAINT "knockout_pairings_knockoutRoundId_fkey" 
        FOREIGN KEY ("knockoutRoundId") REFERENCES "knockout_rounds"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Add unique constraint for knockout rounds
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'knockout_rounds_tournamentId_roundName_key'
    ) THEN
        CREATE UNIQUE INDEX "knockout_rounds_tournamentId_roundName_key" 
        ON "knockout_rounds"("tournamentId", "roundName");
    END IF;
END $$;

-- Add standings foreign key to season_teams
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'standings_teamId_fkey'
    ) THEN
        ALTER TABLE "standings" 
        ADD CONSTRAINT "standings_teamId_fkey" 
        FOREIGN KEY ("teamId") REFERENCES "season_teams"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
