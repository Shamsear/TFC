-- Add 3 dummy SS (Second Striker) players for testing
-- This script adds players to the active season

DO $$
DECLARE
    active_season_id TEXT;
BEGIN
    -- Get the active season
    SELECT id INTO active_season_id
    FROM seasons
    WHERE "isActive" = true
    LIMIT 1;

    -- If no active season, raise error
    IF active_season_id IS NULL THEN
        RAISE EXCEPTION 'No active season found. Please activate a season first.';
    END IF;

    -- Player 1: Marco Rossi (Italian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_001',
        'Marco Rossi',
        'dummy_ss_001',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Player 2: Lucas Silva (Brazilian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_002',
        'Lucas Silva',
        'dummy_ss_002',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Player 3: Ahmed Hassan (Egyptian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES (
        'BP_SS_003',
        'Ahmed Hassan',
        'dummy_ss_003',
        'https://cdn.sofifa.net/players/default.png',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 1: Marco Rossi (Attacking SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'SPS_SS_001',
        'BP_SS_001',
        active_season_id,
        'SS',
        85,
        'Italy',
        'Free Agent',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 2: Lucas Silva (Creative SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'SPS_SS_002',
        'BP_SS_002',
        active_season_id,
        'SS',
        83,
        'Brazil',
        'Free Agent',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert seasonal stats for Player 3: Ahmed Hassan (Physical SS)
    INSERT INTO seasonal_player_stats (
        id,
        "basePlayerId",
        "seasonId",
        position,
        "overallRating",
        nationality,
        "realWorldClub",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'SPS_SS_003',
        'BP_SS_003',
        active_season_id,
        'SS',
        81,
        'Egypt',
        'Free Agent',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Successfully added 3 SS players to season: %', active_season_id;
END $$;

-- Verify the insertion
SELECT 
    bp.id,
    bp.name,
    sps.position,
    sps."overallRating" as overall,
    sps.nationality,
    s.name as season_name
FROM base_players bp
JOIN seasonal_player_stats sps ON bp.id = sps."basePlayerId"
JOIN seasons s ON sps."seasonId" = s.id
WHERE bp.id IN ('BP_SS_001', 'BP_SS_002', 'BP_SS_003')
ORDER BY sps."overallRating" DESC;
