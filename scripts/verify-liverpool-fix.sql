-- Verify Liverpool's Ramón Sosa transfer fix

SELECT '=== Liverpool Current Budget ===' as section;
SELECT 
    t.name as team_name,
    st."currentBudget" as current_budget
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
WHERE st."seasonId" = 'TFCS-4'
  AND t.name LIKE '%Liverpool%';

SELECT '=== Financial Ledger Entry TFCFL-133 ===' as section;
SELECT 
    id,
    amount,
    "previousBalance" as previous_balance,
    "newBalance" as new_balance,
    "player_name",
    description,
    "createdAt"
FROM financial_ledger 
WHERE id = 'TFCFL-133';

SELECT '=== Ramón Sosa Transfer History ===' as section;
SELECT 
    th.id as transfer_id,
    bp.name as player_name,
    bp.player_id,
    t.name as team_name,
    th."soldPrice" as sold_price,
    th."acquisition_type",
    th."acquisition_notes",
    th."createdAt"
FROM transfer_history th
JOIN base_players bp ON th."basePlayerId" = bp.id
JOIN teams t ON th."teamId" = t.id
WHERE th."basePlayerId" = 'TFCP-1174'
  AND th."seasonId" = 'TFCS-4';

SELECT '=== Liverpool Full Squad ===' as section;
SELECT 
    bp.name as player_name,
    bp.player_id,
    sps.position,
    sps."overallRating" as rating,
    th."soldPrice" as price
FROM transfer_history th
JOIN base_players bp ON th."basePlayerId" = bp.id
LEFT JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId" AND sps."seasonId" = 'TFCS-4'
WHERE th."teamId" = (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1)
  AND th."seasonId" = 'TFCS-4'
ORDER BY sps.position, bp.name;

SELECT '=== Liverpool Squad Summary ===' as section;
SELECT 
    COUNT(*) as total_players,
    SUM(th."soldPrice") as total_spent
FROM transfer_history th
WHERE th."teamId" = (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1)
  AND th."seasonId" = 'TFCS-4';
