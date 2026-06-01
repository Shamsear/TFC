-- Set default primary colors for teams that don't have one
-- These are the official brand colors for these football clubs
-- Only includes teams that exist in your database

UPDATE teams SET primary_color = '#e30613' WHERE id = 'TFCM-1' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- AC Milan
UPDATE teams SET primary_color = '#034694' WHERE id = 'TFCM-2' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- AFC Ajax
UPDATE teams SET primary_color = '#e4032e' WHERE id = 'TFCM-46' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- AS Monaco
UPDATE teams SET primary_color = '#00529f' WHERE id = 'TFCM-3' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Al Hilal
UPDATE teams SET primary_color = '#ffc627' WHERE id = 'TFCM-4' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Al Ittihad
UPDATE teams SET primary_color = '#ffd700' WHERE id = 'TFCM-5' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Al Nassr
UPDATE teams SET primary_color = '#ef0107' WHERE id = 'TFCM-6' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Arsenal
UPDATE teams SET primary_color = '#7b003a' WHERE id = 'TFCM-8' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Aston Villa
UPDATE teams SET primary_color = '#670e36' WHERE id = 'TFCM-10' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Atalanta
UPDATE teams SET primary_color = '#ce1127' WHERE id = 'TFCM-9' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Atletico Madrid
UPDATE teams SET primary_color = '#e32219' WHERE id = 'TFCM-41' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Bayer Leverkusen
UPDATE teams SET primary_color = '#dc052d' WHERE id = 'TFCM-11' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Bayern Munich
UPDATE teams SET primary_color = '#005daa' WHERE id = 'TFCM-13' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Boca Juniors
UPDATE teams SET primary_color = '#fde100' WHERE id = 'TFCM-12' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Borussia Dortmund
UPDATE teams SET primary_color = '#0057b8' WHERE id = 'TFCM-35' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Brighton FC
UPDATE teams SET primary_color = '#670e36' WHERE id = 'TFCM-50' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Burnley FC
UPDATE teams SET primary_color = '#034694' WHERE id = 'TFCM-14' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Chelsea
UPDATE teams SET primary_color = '#941f1f' WHERE id = 'TFCM-15' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Club Victoria
UPDATE teams SET primary_color = '#004170' WHERE id = 'TFCM-16' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Como
UPDATE teams SET primary_color = '#1b458f' WHERE id = 'TFCM-49' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Crystal Palace FC
UPDATE teams SET primary_color = '#e1000f' WHERE id = 'TFCM-36' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Eintracht Frankfurt
UPDATE teams SET primary_color = '#a50044' WHERE id = 'TFCM-17' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- FC Barcelona
UPDATE teams SET primary_color = '#e67e22' WHERE id = 'TFCM-18' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- FC Goa
UPDATE teams SET primary_color = '#0068a8' WHERE id = 'TFCM-48' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- FC Porto
UPDATE teams SET primary_color = '#dd0228' WHERE id = 'TFCM-45' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- FC Red Bull Salzburg
UPDATE teams SET primary_color = '#e30613' WHERE id = 'TFCM-7' AND (primary_color IS NULL OR primary_color = '#00e5ff');  -- Flamengo
UPDATE teams SET primary_color = '#ffc627' WHERE id = 'TFCM-42' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Galatasaray
UPDATE teams SET primary_color = '#e4002b' WHERE id = 'TFCM-20' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Girona
UPDATE teams SET primary_color = '#f7b5cd' WHERE id = 'TFCM-44' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Inter Miami
UPDATE teams SET primary_color = '#0068a8' WHERE id = 'TFCM-37' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Inter Milan
UPDATE teams SET primary_color = '#000000' WHERE id = 'TFCM-19' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Juventus
UPDATE teams SET primary_color = '#1c408e' WHERE id = 'TFCM-21' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Leeds United
UPDATE teams SET primary_color = '#003090' WHERE id = 'TFCM-22' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Leicester City
UPDATE teams SET primary_color = '#ec1c24' WHERE id = 'TFCM-23' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Lille
UPDATE teams SET primary_color = '#c8102e' WHERE id = 'TFCM-24' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Liverpool
UPDATE teams SET primary_color = '#6cabdd' WHERE id = 'TFCM-25' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Manchester City
UPDATE teams SET primary_color = '#da291c' WHERE id = 'TFCM-26' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Manchester United
UPDATE teams SET primary_color = '#002d5c' WHERE id = 'TFCM-43' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Napoli
UPDATE teams SET primary_color = '#241f20' WHERE id = 'TFCM-27' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Newcastle United
UPDATE teams SET primary_color = '#e20e0e' WHERE id = 'TFCM-28' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Nottingham Forest
UPDATE teams SET primary_color = '#004170' WHERE id = 'TFCM-38' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- PSG
UPDATE teams SET primary_color = '#e30613' WHERE id = 'TFCM-47' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- PSV
UPDATE teams SET primary_color = '#dd0228' WHERE id = 'TFCM-29' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- RB Leipzig
UPDATE teams SET primary_color = '#febe10' WHERE id = 'TFCM-30' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Real Madrid
UPDATE teams SET primary_color = '#da291c' WHERE id = 'TFCM-39' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- SL Benfica
UPDATE teams SET primary_color = '#000000' WHERE id = 'TFCM-31' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Santos
UPDATE teams SET primary_color = '#d71920' WHERE id = 'TFCM-32' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Sepahan SC
UPDATE teams SET primary_color = '#007a33' WHERE id = 'TFCM-40' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Sporting CP
UPDATE teams SET primary_color = '#eb172b' WHERE id = 'TFCM-33' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Sunderland
UPDATE teams SET primary_color = '#132257' WHERE id = 'TFCM-34' AND (primary_color IS NULL OR primary_color = '#00e5ff'); -- Tottenham

-- Verify the update
SELECT id, name, "managerName", primary_color 
FROM teams 
ORDER BY name;
