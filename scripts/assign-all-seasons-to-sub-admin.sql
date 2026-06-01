-- Assign all seasons to a specific sub-admin
-- Replace 'TFCU-2' with the actual sub-admin user ID

-- First, check what sub-admins exist
SELECT id, name, email, role FROM users WHERE role = 'SUB_ADMIN';

-- Check what seasons exist
SELECT id, name, is_active FROM seasons ORDER BY created_at DESC;

-- Assign all seasons to a specific sub-admin (replace TFCU-2 with actual user ID)
INSERT INTO sub_admin_seasons (user_id, season_id, created_at)
SELECT 'TFCU-2', id, NOW()
FROM seasons
ON CONFLICT (user_id, season_id) DO NOTHING;

-- Verify the assignments
SELECT 
    sas.user_id,
    u.name as sub_admin_name,
    sas.season_id,
    s.name as season_name,
    sas.created_at
FROM sub_admin_seasons sas
JOIN users u ON sas.user_id = u.id
JOIN seasons s ON sas.season_id = s.id
WHERE sas.user_id = 'TFCU-2'
ORDER BY s.name;
