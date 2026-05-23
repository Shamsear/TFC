-- Add endDate column to auction_calendar table
-- This will store the deadline (end date and time) for each auction calendar entry

-- Add the column (nullable first to allow existing data)
ALTER TABLE auction_calendar ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- Update existing records to have endDate = auctionDate + 3 hours
UPDATE auction_calendar 
SET "endDate" = "auctionDate" + INTERVAL '3 hours'
WHERE "endDate" IS NULL;

-- Now make it NOT NULL since all records have values
ALTER TABLE auction_calendar ALTER COLUMN "endDate" SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "auction_calendar_endDate_idx" ON auction_calendar("endDate");

-- Verify the update
SELECT 
    id,
    description,
    "auctionDate" as start_time,
    "endDate" as end_time,
    "endDate" - "auctionDate" as duration_hours
FROM auction_calendar
ORDER BY "auctionDate" DESC
LIMIT 10;
