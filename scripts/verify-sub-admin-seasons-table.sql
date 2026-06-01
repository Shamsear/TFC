-- Verify the sub_admin_seasons table exists and check its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sub_admin_seasons'
ORDER BY ordinal_position;

-- Check if there are any records
SELECT COUNT(*) as total_records FROM sub_admin_seasons;

-- Show all current sub-admin season assignments
SELECT 
    sas.user_id,
    u.name as sub_admin_name,
    u.email as sub_admin_email,
    sas.season_id,
    s.name as season_name,
    sas.created_at
FROM sub_admin_seasons sas
JOIN users u ON sas.user_id = u.id
JOIN seasons s ON sas.season_id = s.id
ORDER BY u.name, s.name;

-- List all sub-admins and their assigned seasons count
SELECT 
    u.id,
    u.name,
    u.email,
    u.is_active,
    COUNT(sas.season_id) as assigned_seasons_count
FROM users u
LEFT JOIN sub_admin_seasons sas ON u.id = sas.user_id
WHERE u.role = 'SUB_ADMIN'
GROUP BY u.id, u.name, u.email, u.is_active
ORDER BY u.name;
