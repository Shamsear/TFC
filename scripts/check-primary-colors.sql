-- Check if teams have primary_color set
SELECT 
  id,
  name,
  primary_color,
  CASE 
    WHEN primary_color IS NULL THEN 'NOT SET'
    ELSE 'SET'
  END as color_status
FROM teams
ORDER BY name;
