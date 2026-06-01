-- Set default primary colors for teams that don't have one
-- These are the official brand colors for these football clubs

-- Premier League & English Teams
UPDATE teams SET primary_color = '#ef0107' WHERE name = 'Arsenal' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#7b003a' WHERE name = 'Aston Villa' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#6cabdd' WHERE name = 'Manchester City' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Manchester United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#c8102e' WHERE name = 'Liverpool' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#034694' WHERE name = 'Chelsea' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#132257' WHERE name = 'Tottenham Hotspur' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#003090' WHERE name = 'Leicester City' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#1c408e' WHERE name = 'Leeds United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#eb172b' WHERE name = 'Sunderland' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e20e0e' WHERE name = 'Nottingham Forest' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#274488' WHERE name = 'Everton' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#d71920' WHERE name = 'Southampton' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0057b8' WHERE name = 'Brighton' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#1b458f' WHERE name = 'West Ham United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#241f20' WHERE name = 'Newcastle United' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Stoke City' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#fbee23' WHERE name = 'Watford' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#670e36' WHERE name = 'Burnley' AND primary_color IS NULL;

-- La Liga & Spanish Teams
UPDATE teams SET primary_color = '#febe10' WHERE name = 'Real Madrid' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#a50044' WHERE name = 'FC Barcelona' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ce1127' WHERE name = 'Atletico Madrid' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#005daa' WHERE name = 'Sevilla' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#f78f1e' WHERE name = 'Valencia' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004170' WHERE name = 'Real Sociedad' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ee2523' WHERE name = 'Athletic Bilbao' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e4002b' WHERE name = 'Girona' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#007a33' WHERE name = 'Real Betis' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ffd700' WHERE name = 'Villarreal' AND primary_color IS NULL;

-- Serie A & Italian Teams
UPDATE teams SET primary_color = '#000000' WHERE name = 'Juventus' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'AC Milan' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name = 'Inter Milan' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#8b0304' WHERE name = 'AS Roma' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#87ceeb' WHERE name = 'Lazio' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#002d5c' WHERE name = 'Napoli' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#670e36' WHERE name = 'Atalanta' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004170' WHERE name = 'Como' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#822433' WHERE name = 'Torino' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#002d62' WHERE name = 'Fiorentina' AND primary_color IS NULL;

-- Bundesliga & German Teams
UPDATE teams SET primary_color = '#dc052d' WHERE name = 'Bayern Munich' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#fde100' WHERE name = 'Borussia Dortmund' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#dd0228' WHERE name = 'RB Leipzig' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e32219' WHERE name = 'Bayer Leverkusen' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004d9d' WHERE name = 'Schalke 04' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#007a33' WHERE name = 'Werder Bremen' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#1a1a1a' WHERE name = 'Borussia Monchengladbach' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'VfB Stuttgart' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#005ca9' WHERE name = 'Hertha Berlin' AND primary_color IS NULL;

-- Ligue 1 & French Teams
UPDATE teams SET primary_color = '#004170' WHERE name = 'Paris Saint-Germain' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#2d9cdb' WHERE name = 'Marseille' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Lyon' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e4032e' WHERE name = 'Monaco' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ec1c24' WHERE name = 'Lille' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Rennes' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#1e3a8a' WHERE name = 'Nice' AND primary_color IS NULL;

-- Eredivisie & Dutch Teams
UPDATE teams SET primary_color = '#034694' WHERE name = 'AFC Ajax' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'PSV Eindhoven' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#007a33' WHERE name = 'Feyenoord' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ffc627' WHERE name = 'AZ Alkmaar' AND primary_color IS NULL;

-- Portuguese Teams
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Benfica' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name = 'FC Porto' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#007a33' WHERE name = 'Sporting CP' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#003366' WHERE name = 'SC Braga' AND primary_color IS NULL;

-- South American Teams
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Flamengo' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#005daa' WHERE name = 'Boca Juniors' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'River Plate' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#000000' WHERE name = 'Santos' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#000000' WHERE name = 'Corinthians' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#006341' WHERE name = 'Palmeiras' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name = 'Cruzeiro' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#000000' WHERE name = 'Atletico Mineiro' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Internacional' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#003366' WHERE name = 'Gremio' AND primary_color IS NULL;

-- Middle Eastern & Asian Teams
UPDATE teams SET primary_color = '#00529f' WHERE name = 'Al Hilal' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ffd700' WHERE name = 'Al Nassr' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Al Ahly' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ffc627' WHERE name = 'Al Ittihad' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#d71920' WHERE name = 'Sepahan SC' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'Persepolis' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name = 'Esteghlal' AND primary_color IS NULL;

-- Indian Teams
UPDATE teams SET primary_color = '#e67e22' WHERE name = 'FC Goa' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004d9d' WHERE name = 'Bengaluru FC' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name = 'ATK Mohun Bagan' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#da291c' WHERE name = 'Mumbai City FC' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#ffc627' WHERE name = 'Kerala Blasters' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#004170' WHERE name = 'Chennaiyin FC' AND primary_color IS NULL;

-- Other Notable Teams
UPDATE teams SET primary_color = '#941f1f' WHERE name = 'Club Victoria' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#e30613' WHERE name LIKE '%United%' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name LIKE '%City%' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#007a33' WHERE name LIKE '%Celtic%' AND primary_color IS NULL;
UPDATE teams SET primary_color = '#0068a8' WHERE name LIKE '%Rangers%' AND primary_color IS NULL;

-- Verify the update
SELECT id, name, primary_color 
FROM teams 
WHERE primary_color IS NOT NULL
ORDER BY name;
