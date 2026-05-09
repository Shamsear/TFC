-- Add seasonNumber column to seasons table
-- Run this SQL script in your database

-- Step 1: Add the column (nullable first)
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "season_number" INTEGER;

-- Step 2: Update existing seasons with sequential numbers
WITH numbered_seasons AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
  FROM seasons
)
UPDATE seasons
SET season_number = numbered_seasons.rn
FROM numbered_seasons
WHERE seasons.id = numbered_seasons.id;

-- Step 3: Make seasonNumber NOT NULL and UNIQUE
ALTER TABLE "seasons" ALTER COLUMN "season_number" SET NOT NULL;

-- Drop constraint if it exists, then add it
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'seasons_season_number_key') THEN
    ALTER TABLE "seasons" DROP CONSTRAINT "seasons_season_number_key";
  END IF;
END $$;

ALTER TABLE "seasons" ADD CONSTRAINT "seasons_season_number_key" UNIQUE ("season_number");

-- Verify the changes
SELECT id, season_number, name, "startingPurse", "isActive", "createdAt" 
FROM seasons 
ORDER BY season_number;
