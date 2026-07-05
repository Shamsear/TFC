-- Create Enum Types if they don't exist
DO $$ BEGIN
    CREATE TYPE "TournamentLinkType" AS ENUM (
        'TOP_N',
        'BOTTOM_N',
        'POSITION_RANGE',
        'WINNER',
        'RUNNER_UP',
        'GROUP_POSITION',
        'MULTIPLE_POSITIONS_PER_GROUP'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentLinkStatus" AS ENUM (
        'PENDING',
        'ACTIVE',
        'COMPLETED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TournamentQualificationStatus" AS ENUM (
        'PENDING',
        'PARTIAL',
        'COMPLETE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter Tournaments Table to add new columns (with camelCase names that match Prisma client)
ALTER TABLE "tournaments" 
  ADD COLUMN IF NOT EXISTS "isLinked" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "requiresQualification" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "qualificationStatus" "TournamentQualificationStatus" NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN IF NOT EXISTS "expectedTeams" INTEGER;

-- Create tournament_links table
CREATE TABLE IF NOT EXISTS "tournament_links" (
  "id" VARCHAR(36) PRIMARY KEY,
  "source_tournament_id" VARCHAR(36) NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "target_tournament_id" VARCHAR(36) NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "linkType" "TournamentLinkType" NOT NULL,
  "qualification_config" JSONB NOT NULL,
  "status" "TournamentLinkStatus" NOT NULL DEFAULT 'PENDING',
  "teams_populated" BOOLEAN NOT NULL DEFAULT FALSE,
  "populated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("source_tournament_id", "target_tournament_id")
);

-- Create indexes for tournament_links
CREATE INDEX IF NOT EXISTS "idx_tournament_links_source" ON "tournament_links"("source_tournament_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_links_target" ON "tournament_links"("target_tournament_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_links_status" ON "tournament_links"("status");

-- Create tournament_team_qualifications table
CREATE TABLE IF NOT EXISTS "tournament_team_qualifications" (
  "id" VARCHAR(36) PRIMARY KEY,
  "tournament_link_id" VARCHAR(36) NOT NULL REFERENCES "tournament_links"("id") ON DELETE CASCADE,
  "season_team_id" VARCHAR(36) NOT NULL REFERENCES "season_teams"("id") ON DELETE CASCADE,
  "source_tournament_id" VARCHAR(36) NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "target_tournament_id" VARCHAR(36) NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "qualification_position" INTEGER,
  "group_name" VARCHAR(100),
  "qualified_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "slot_number" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PROVISIONAL',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("tournament_link_id", "season_team_id")
);

-- Create indexes for tournament_team_qualifications
CREATE INDEX IF NOT EXISTS "idx_tournament_team_qualifications_link" ON "tournament_team_qualifications"("tournament_link_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_team_qualifications_team" ON "tournament_team_qualifications"("season_team_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_team_qualifications_source" ON "tournament_team_qualifications"("source_tournament_id");
CREATE INDEX IF NOT EXISTS "idx_tournament_team_qualifications_target" ON "tournament_team_qualifications"("target_tournament_id");
