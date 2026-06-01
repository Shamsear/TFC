-- ============================================
-- VERIFY ASSIGNED_SEASONS COLUMN EXISTS
-- ============================================

-- Check if the assigned_seasons column exists in the users table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'users' 
    AND column_name = 'assigned_seasons';

-- If the above query returns no rows, the column doesn't exist
-- If it returns a row, the column exists

-- ============================================
-- ADD COLUMN IF IT DOESN'T EXIST
-- ============================================

-- Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS assigned_seasons JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'users' 
    AND column_name = 'assigned_seasons';

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- View all sub-admins and their assigned seasons
SELECT 
    id,
    name,
    email,
    role,
    is_active,
    assigned_seasons,
    "createdAt" as created_at
FROM 
    users
WHERE 
    role = 'SUB_ADMIN'
ORDER BY 
    "createdAt" DESC;

-- Count sub-admins with and without season assignments
SELECT 
    CASE 
        WHEN jsonb_array_length(assigned_seasons) = 0 THEN 'No seasons assigned'
        ELSE 'Has season assignments'
    END as assignment_status,
    COUNT(*) as count
FROM 
    users
WHERE 
    role = 'SUB_ADMIN'
GROUP BY 
    assignment_status;
