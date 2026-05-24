-- Add status column to transfer_history table
-- This allows us to track player status without deleting historical records

-- Create enum for transfer status
DO $$ BEGIN
    CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'RELEASED', 'SWAPPED_OUT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column with default value 'ACTIVE'
ALTER TABLE "transfer_history" 
ADD COLUMN IF NOT EXISTS "status" "TransferStatus" NOT NULL DEFAULT 'ACTIVE';

-- Add released_at timestamp for tracking when player was released/swapped
ALTER TABLE "transfer_history"
ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMP(3);

-- Add release_notes for documenting why player was released/swapped
ALTER TABLE "transfer_history"
ADD COLUMN IF NOT EXISTS "release_notes" TEXT;

-- Create index for faster queries on active players
CREATE INDEX IF NOT EXISTS "transfer_history_status_idx" ON "transfer_history"("status");

-- Create composite index for common query pattern (seasonId + teamId + status)
CREATE INDEX IF NOT EXISTS "transfer_history_season_team_status_idx" 
ON "transfer_history"("seasonId", "teamId", "status");

-- Update existing records to have ACTIVE status (they're already active)
UPDATE "transfer_history" 
SET "status" = 'ACTIVE' 
WHERE "status" IS NULL;

COMMENT ON COLUMN "transfer_history"."status" IS 'Current status of the transfer: ACTIVE (player with team), RELEASED (player released), SWAPPED_OUT (player swapped to another team)';
COMMENT ON COLUMN "transfer_history"."released_at" IS 'Timestamp when player was released or swapped from the team';
COMMENT ON COLUMN "transfer_history"."release_notes" IS 'Admin notes explaining why player was released or swapped';
