-- ============================================
-- QUICK ASSIGN SEASON TO SUB-ADMIN
-- Simple script to assign seasons
-- ============================================

-- STEP 1: Get your season ID
SELECT id, name, season_number, "isActive" 
FROM seasons 
ORDER BY season_number DESC;

-- STEP 2: Get your sub-admin user ID
SELECT id, name, email, assigned_seasons 
FROM users 
WHERE role = 'SUB_ADMIN';

-- STEP 3: Copy the IDs from above and paste them below, then uncomment and run

-- Assign ONE season to ONE sub-admin:
-- UPDATE users 
-- SET assigned_seasons = '["PASTE-SEASON-ID-HERE"]'::jsonb
-- WHERE id = 'PASTE-USER-ID-HERE';

-- Assign MULTIPLE seasons to ONE sub-admin:
-- UPDATE users 
-- SET assigned_seasons = '["SEASON-ID-1", "SEASON-ID-2"]'::jsonb
-- WHERE id = 'PASTE-USER-ID-HERE';

-- Assign ALL seasons to ONE sub-admin:
-- UPDATE users 
-- SET assigned_seasons = (SELECT jsonb_agg(id) FROM seasons)
-- WHERE id = 'PASTE-USER-ID-HERE';

-- Assign active season to ALL sub-admins:
-- UPDATE users 
-- SET assigned_seasons = (SELECT jsonb_agg(id) FROM seasons WHERE "isActive" = true)
-- WHERE role = 'SUB_ADMIN';

-- STEP 4: Verify the assignment
SELECT 
    u.id,
    u.name,
    u.email,
    u.assigned_seasons,
    (
        SELECT string_agg(s.name, ', ')
        FROM seasons s
        WHERE s.id = ANY(
            SELECT jsonb_array_elements_text(u.assigned_seasons)
        )
    ) as season_names
FROM users u
WHERE u.role = 'SUB_ADMIN';
