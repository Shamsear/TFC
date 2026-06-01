-- Set default primary colors for teams that don't have one
-- These are generic colors that can be customized later

UPDATE teams SET primary_color = '#e30613' WHERE name = 'AC Milan' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#034694' WHERE name = 'AFC Ajax' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#00529f' WHERE name = 'Al Hilal' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ef0107' WHERE name = 'Arsenal' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#7b003a' WHERE name = 'Aston Villa' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#670e36' WHERE name = 'Atalanta' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ce1127' WHERE name = 'Atletico Madrid' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#dc052d' WHERE name = 'Bayern Munich' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#005daa' WHERE name = 'Boca Juniors' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#fde100' WHERE name = 'Borussia Dortmund' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#034694' WHERE name = 'Chelsea' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#941f1f' WHERE name = 'Club Victoria' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004170' WHERE name = 'Como' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#a50044' WHERE name = 'FC Barcelona' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e67e22' WHERE name = 'FC Goa' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Flamengo' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e4002b' WHERE name = 'Girona' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#000000' WHERE name = 'Juventus' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#1c408e' WHERE name = 'Leeds United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#003090' WHERE name = 'Leicester City' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ec1c24' WHERE name = 'Lille' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#c8102e' WHERE name = 'Liverpool' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#6cabdd' WHERE name = 'Manchester City' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Manchester United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e20e0e' WHERE name = 'Nottingham Forest' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#dd0228' WHERE name = 'RB Leipzig' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#febe10' WHERE name = 'Real Madrid' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#000000' WHERE name = 'Santos' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#d71920' WHERE name = 'Sepahan SC' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#eb172b' WHERE name = 'Sunderland' AND primary_color IS NULL;

-- Verify the update
SELECT id, name, primary_color 
FROM teams 
WHERE primary_color IS NOT NULL
ORDER BY name;
