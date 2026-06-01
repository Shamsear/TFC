-- Test inserting a record into sub_admin_seasons
-- This will help diagnose if the table is working correctly

-- Step 1: Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'sub_admin_seasons'
) as table_exists;

-- Step 2: Get a sub-admin user ID
SELECT id, name, email FROM users WHERE role = 'SUB_ADMIN' LIMIT 1;

-- Step 3: Get a season ID
SELECT id, name FROM seasons LIMIT 1;

-- Step 4: Try to insert a test record (replace with actual IDs from steps 2 and 3)
-- Uncomment and replace the IDs below:
-- INSERT INTO sub_admin_seasons (user_id, season_id, created_at)
-- VALUES ('YOUR_SUB_ADMIN_ID', 'YOUR_SEASON_ID', NOW())
-- ON CONFLICT (user_id, season_id) DO NOTHING
-- RETURNING *;

-- Step 5: Check what's in the table
SELECT * FROM sub_admin_seasons;
