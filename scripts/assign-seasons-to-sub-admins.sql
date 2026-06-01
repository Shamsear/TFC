-- ============================================
-- ASSIGN SEASONS TO SUB-ADMINS
-- Helper script to assign seasons to sub-admin users
-- ============================================

-- ============================================
-- STEP 1: VIEW AVAILABLE SEASONS
-- ============================================
SELECT 
    id,
    name,
    season_number,
    "isActive" as is_active,
    "startingPurse" as starting_purse,
    "createdAt" as created_at
FROM 
    seasons
ORDER BY 
    season_number DESC;

-- ============================================
-- STEP 2: VIEW EXISTING SUB-ADMINS
-- ============================================
SELECT 
    id,
    name,
    email,
    is_active,
    assigned_seasons,
    "createdAt" as created_at
FROM 
    users
WHERE 
    role = 'SUB_ADMIN'
ORDER BY 
    "createdAt" DESC;

-- ============================================
-- STEP 3: ASSIGN SEASONS TO A SUB-ADMIN
-- ============================================

-- Example 1: Assign a single season
-- UPDATE users 
-- SET 
--     assigned_seasons = '["season-id-here"]'::jsonb,
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- Example 2: Assign multiple seasons
-- UPDATE users 
-- SET 
--     assigned_seasons = '["season-id-1", "season-id-2", "season-id-3"]'::jsonb,
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- Example 3: Assign ALL seasons to a sub-admin
-- UPDATE users 
-- SET 
--     assigned_seasons = (
--         SELECT jsonb_agg(id)
--         FROM seasons
--     ),
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- Example 4: Assign only active season
-- UPDATE users 
-- SET 
--     assigned_seasons = (
--         SELECT jsonb_agg(id)
--         FROM seasons
--         WHERE "isActive" = true
--     ),
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- Example 5: Add a season to existing assignments (don't replace)
-- UPDATE users 
-- SET 
--     assigned_seasons = assigned_seasons || '["new-season-id"]'::jsonb,
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- Example 6: Remove a season from assignments
-- UPDATE users 
-- SET 
--     assigned_seasons = assigned_seasons - 'season-id-to-remove',
--     "updatedAt" = NOW()
-- WHERE 
--     id = 'sub-admin-user-id-here' 
--     AND role = 'SUB_ADMIN';

-- ============================================
-- STEP 4: VERIFY THE ASSIGNMENT
-- ============================================
SELECT 
    u.id,
    u.name,
    u.email,
    u.assigned_seasons,
    jsonb_array_length(u.assigned_seasons) as season_count,
    (
        SELECT jsonb_agg(s.name)
        FROM seasons s
        WHERE s.id IN (
            SELECT jsonb_array_elements_text(u.assigned_seasons)
        )
    ) as season_names
FROM 
    users u
WHERE 
    u.role = 'SUB_ADMIN'
ORDER BY 
    u."createdAt" DESC;

-- ============================================
-- BULK OPERATIONS
-- ============================================

-- Assign active season to ALL sub-admins
-- UPDATE users 
-- SET 
--     assigned_seasons = (
--         SELECT jsonb_agg(id)
--         FROM seasons
--         WHERE "isActive" = true
--     ),
--     "updatedAt" = NOW()
-- WHERE 
--     role = 'SUB_ADMIN';

-- Clear all season assignments (remove access)
-- UPDATE users 
-- SET 
--     assigned_seasons = '[]'::jsonb,
--     "updatedAt" = NOW()
-- WHERE 
--     role = 'SUB_ADMIN';

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Find sub-admins with no season assignments
SELECT 
    id,
    name,
    email,
    is_active
FROM 
    users
WHERE 
    role = 'SUB_ADMIN'
    AND (
        assigned_seasons = '[]'::jsonb 
        OR assigned_seasons IS NULL
    );

-- Find sub-admins assigned to a specific season
SELECT 
    u.id,
    u.name,
    u.email,
    u.assigned_seasons
FROM 
    users u
WHERE 
    u.role = 'SUB_ADMIN'
    AND u.assigned_seasons @> '["specific-season-id"]'::jsonb;

-- Count seasons per sub-admin
SELECT 
    name,
    email,
    jsonb_array_length(assigned_seasons) as season_count,
    is_active
FROM 
    users
WHERE 
    role = 'SUB_ADMIN'
ORDER BY 
    season_count DESC;
