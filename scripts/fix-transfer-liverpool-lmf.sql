-- Transfer TFCP-1174 to Liverpool for Season TFCS-4
-- This fixes the missing LMF player issue

-- First, verify the player exists and get details
SELECT 
    bp.id,
    bp.name,
    bp.player_id,
    sps.position,
    sps."overallRating"
FROM base_players bp
LEFT JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId" AND sps."seasonId" = 'TFCS-4'
WHERE bp.id = 'TFCP-1174';

-- Find Liverpool's team ID
SELECT id, name FROM teams WHERE name LIKE '%Liverpool%';

-- Check if player is already transferred
SELECT * FROM transfer_history 
WHERE "basePlayerId" = 'TFCP-1174' 
  AND "seasonId" = 'TFCS-4';

-- Insert transfer record
INSERT INTO transfer_history (
    id,
    "basePlayerId",
    "seasonId",
    "teamId",
    "round_id",
    "soldPrice",
    "acquisition_type",
    "acquisition_notes"
) VALUES (
    'TFCT-' || LPAD(CAST((SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) + 1 FROM transfer_history WHERE id LIKE 'TFCT-%') AS TEXT), 5, '0'),
    'TFCP-1174',
    'TFCS-4',
    (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1),
    NULL,
    10,    -- Base price
    'manual_assignment',
    'Manual assignment to replace deleted LMF player'
);

-- Update Liverpool's budget (deduct 10)
UPDATE season_teams
SET "currentBudget" = "currentBudget" - 10
WHERE "seasonId" = 'TFCS-4'
  AND "teamId" = (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1);

-- Create ledger entry
INSERT INTO financial_ledger (
    id,
    "teamId",
    "seasonId",
    "transactionType",
    amount,
    "balanceAfter",
    description,
    "relatedEntityId",
    "relatedEntityType"
) VALUES (
    'TFCF-' || LPAD(CAST((SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)), 0) + 1 FROM financial_ledger WHERE id LIKE 'TFCF-%') AS TEXT), 5, '0'),
    (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1),
    'TFCS-4',
    'player_purchase',
    -10,
    (SELECT "currentBudget" FROM season_teams WHERE "seasonId" = 'TFCS-4' AND "teamId" = (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1)),
    'Manual assignment: ' || (SELECT name FROM base_players WHERE id = 'TFCP-1174'),
    'TFCP-1174',
    'player'
);

-- Verify the transfer
SELECT 
    th.id as transfer_id,
    bp.name as player_name,
    bp.player_id,
    t.name as team_name,
    th."soldPrice",
    th."acquisition_type",
    th."acquisition_notes"
FROM transfer_history th
JOIN base_players bp ON th."basePlayerId" = bp.id
JOIN teams t ON th."teamId" = t.id
WHERE th."basePlayerId" = 'TFCP-1174'
  AND th."seasonId" = 'TFCS-4';

-- Check Liverpool's updated budget
SELECT 
    t.name,
    st."currentBudget",
    st."initialBudget"
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
WHERE st."seasonId" = 'TFCS-4'
  AND t.name LIKE '%Liverpool%';
