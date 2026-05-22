-- Fix Ramón Sosa (TFCP-1174) transfer to Liverpool
-- Change price from 30 to 21 and recalculate balance

-- Step 1: Check current state
SELECT 'Current Liverpool Budget:' as info;
SELECT 
    t.name as team_name,
    st."currentBudget"
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
WHERE st."seasonId" = 'TFCS-4'
  AND t.name LIKE '%Liverpool%';

SELECT 'Current Financial Ledger Entry:' as info;
SELECT * FROM financial_ledger WHERE id = 'TFCFL-133';

SELECT 'Current Transfer History:' as info;
SELECT * FROM transfer_history 
WHERE "basePlayerId" = 'TFCP-1174' 
  AND "seasonId" = 'TFCS-4';

-- Step 2: Get Liverpool's season_team ID
DO $$
DECLARE
    liverpool_team_id TEXT;
    liverpool_season_team_id TEXT;
    current_balance INT;
    previous_balance INT;
    new_balance INT;
    transfer_exists BOOLEAN;
BEGIN
    -- Get Liverpool's team ID
    SELECT id INTO liverpool_team_id
    FROM teams 
    WHERE name LIKE '%Liverpool%' 
    LIMIT 1;

    -- Get Liverpool's season_team ID
    SELECT id, "currentBudget" INTO liverpool_season_team_id, current_balance
    FROM season_teams
    WHERE "seasonId" = 'TFCS-4'
      AND "teamId" = liverpool_team_id;

    -- Check if transfer already exists
    SELECT EXISTS(
        SELECT 1 FROM transfer_history 
        WHERE "basePlayerId" = 'TFCP-1174' 
          AND "seasonId" = 'TFCS-4'
    ) INTO transfer_exists;

    -- Calculate balances
    -- Current balance should be adjusted: add back 30, subtract 21
    -- Difference: +9
    previous_balance := current_balance + 21;  -- Balance before this purchase
    new_balance := current_balance + 9;  -- Adjust by difference (30 - 21 = 9)

    RAISE NOTICE 'Liverpool Team ID: %', liverpool_team_id;
    RAISE NOTICE 'Liverpool Season Team ID: %', liverpool_season_team_id;
    RAISE NOTICE 'Current Balance: %', current_balance;
    RAISE NOTICE 'Previous Balance: %', previous_balance;
    RAISE NOTICE 'New Balance (after correction): %', new_balance;
    RAISE NOTICE 'Transfer exists: %', transfer_exists;

    -- Step 3: Update financial ledger entry TFCFL-133
    UPDATE financial_ledger
    SET 
        amount = -21,  -- Changed from -30 to -21
        "newBalance" = previous_balance - 21,
        "player_name" = 'Ramón Sosa',
        description = 'Player purchase: Ramón Sosa (Price corrected from 30 to 21)'
    WHERE id = 'TFCFL-133';

    -- Step 4: Update Liverpool's current budget
    UPDATE season_teams
    SET "currentBudget" = new_balance
    WHERE id = liverpool_season_team_id;

    -- Step 5: Create or update transfer history
    IF transfer_exists THEN
        -- Update existing transfer
        UPDATE transfer_history
        SET 
            "soldPrice" = 21,
            "acquisition_type" = 'manual_assignment',
            "acquisition_notes" = 'Manual assignment - Ramón Sosa (Price corrected from 30 to 21)'
        WHERE "basePlayerId" = 'TFCP-1174'
          AND "seasonId" = 'TFCS-4';
        
        RAISE NOTICE 'Updated existing transfer record';
    ELSE
        -- Create new transfer record
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
            liverpool_team_id,
            NULL,
            21,
            'manual_assignment',
            'Manual assignment - Ramón Sosa'
        );
        
        RAISE NOTICE 'Created new transfer record';
    END IF;

END $$;

-- Step 6: Verify the changes
SELECT 'Updated Liverpool Budget:' as info;
SELECT 
    t.name as team_name,
    st."currentBudget"
FROM season_teams st
JOIN teams t ON st."teamId" = t.id
WHERE st."seasonId" = 'TFCS-4'
  AND t.name LIKE '%Liverpool%';

SELECT 'Updated Financial Ledger Entry:' as info;
SELECT 
    id,
    amount,
    "previousBalance",
    "newBalance",
    "player_name",
    description
FROM financial_ledger 
WHERE id = 'TFCFL-133';

SELECT 'Transfer History:' as info;
SELECT 
    th.id,
    bp.name as player_name,
    t.name as team_name,
    th."soldPrice",
    th."acquisition_type",
    th."acquisition_notes"
FROM transfer_history th
JOIN base_players bp ON th."basePlayerId" = bp.id
JOIN teams t ON th."teamId" = t.id
WHERE th."basePlayerId" = 'TFCP-1174'
  AND th."seasonId" = 'TFCS-4';

SELECT 'Liverpool Squad Count:' as info;
SELECT COUNT(*) as squad_size
FROM transfer_history
WHERE "teamId" = (SELECT id FROM teams WHERE name LIKE '%Liverpool%' LIMIT 1)
  AND "seasonId" = 'TFCS-4';
