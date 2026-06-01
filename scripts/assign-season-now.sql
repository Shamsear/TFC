-- ============================================
-- ASSIGN SEASON TO SUB-ADMIN - READY TO USE
-- Replace the placeholder IDs and run this script
-- ============================================

-- First, let's see what we have:
\echo '=== AVAILABLE SEASONS ==='
SELECT id, name, season_number, "isActive" as is_active
FROM seasons 
ORDER BY season_number DESC;

\echo ''
\echo '=== EXISTING SUB-ADMINS ==='
SELECT id, name, email, assigned_seasons
FROM users 
WHERE role = 'SUB_ADMIN';

\echo ''
\echo '=== NOW ASSIGNING... ==='

-- REPLACE THESE VALUES:
-- 1. Replace 'YOUR-SUB-ADMIN-USER-ID' with the actual user ID from above
-- 2. Replace 'YOUR-SEASON-ID' with the actual season ID from above
-- 3. If you want multiple seasons, add more IDs like: '["id1", "id2", "id3"]'

UPDATE users 
SET 
    assigned_seasons = '["YOUR-SEASON-ID"]'::jsonb,
    "updatedAt" = NOW()
WHERE 
    id = 'YOUR-SUB-ADMIN-USER-ID' 
    AND role = 'SUB_ADMIN';

\echo ''
\echo '=== VERIFICATION ==='
SELECT 
    u.id,
    u.name as user_name,
    u.email,
    u.assigned_seasons,
    (
        SELECT string_agg(s.name, ', ')
        FROM seasons s
        WHERE s.id = ANY(
            SELECT jsonb_array_elements_text(u.assigned_seasons)
        )
    ) as assigned_season_names
FROM users u
WHERE u.role = 'SUB_ADMIN';

\echo ''
\echo '=== DONE! ==='
