-- Fix RequestStatus enum type for existing tables
-- This script converts the VARCHAR status columns to use the proper enum type

-- Step 1: Create the RequestStatus enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Fix release_requests table
-- Drop default, convert type, then re-add default
ALTER TABLE release_requests 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE release_requests 
ALTER COLUMN status TYPE "RequestStatus" USING status::"RequestStatus";

ALTER TABLE release_requests 
ALTER COLUMN status SET DEFAULT 'pending'::"RequestStatus";

-- Step 3: Fix swap_requests table
-- Drop default, convert type, then re-add default
ALTER TABLE swap_requests 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE swap_requests 
ALTER COLUMN status TYPE "RequestStatus" USING status::"RequestStatus";

ALTER TABLE swap_requests 
ALTER COLUMN status SET DEFAULT 'pending'::"RequestStatus";

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('release_requests', 'swap_requests') 
AND column_name = 'status';
