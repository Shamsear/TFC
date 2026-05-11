-- Add 30 additional SS (Second Striker) players for testing
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

    -- Player 4: Thomas Müller (German SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_004', 'Thomas Müller', 'dummy_ss_004', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_004', 'BP_SS_004', active_season_id, 'SS', 84, 'Germany', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 5: Antoine Griezmann (French SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_005', 'Antoine Griezmann', 'dummy_ss_005', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_005', 'BP_SS_005', active_season_id, 'SS', 86, 'France', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 6: Paulo Dybala (Argentine SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_006', 'Paulo Dybala', 'dummy_ss_006', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_006', 'BP_SS_006', active_season_id, 'SS', 85, 'Argentina', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 7: Kai Havertz (German SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_007', 'Kai Havertz', 'dummy_ss_007', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_007', 'BP_SS_007', active_season_id, 'SS', 83, 'Germany', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 8: João Félix (Portuguese SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_008', 'João Félix', 'dummy_ss_008', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_008', 'BP_SS_008', active_season_id, 'SS', 84, 'Portugal', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 9: Lautaro Martínez (Argentine SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_009', 'Lautaro Martínez', 'dummy_ss_009', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_009', 'BP_SS_009', active_season_id, 'SS', 87, 'Argentina', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 10: Dušan Vlahović (Serbian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_010', 'Dušan Vlahović', 'dummy_ss_010', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_010', 'BP_SS_010', active_season_id, 'SS', 85, 'Serbia', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 11: Christopher Nkunku (French SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_011', 'Christopher Nkunku', 'dummy_ss_011', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_011', 'BP_SS_011', active_season_id, 'SS', 84, 'France', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 12: Rafael Leão (Portuguese SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_012', 'Rafael Leão', 'dummy_ss_012', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_012', 'BP_SS_012', active_season_id, 'SS', 85, 'Portugal', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 13: Jamal Musiala (German SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_013', 'Jamal Musiala', 'dummy_ss_013', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_013', 'BP_SS_013', active_season_id, 'SS', 83, 'Germany', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 14: Khvicha Kvaratskhelia (Georgian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_014', 'Khvicha Kvaratskhelia', 'dummy_ss_014', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_014', 'BP_SS_014', active_season_id, 'SS', 84, 'Georgia', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 15: Julián Álvarez (Argentine SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_015', 'Julián Álvarez', 'dummy_ss_015', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_015', 'BP_SS_015', active_season_id, 'SS', 82, 'Argentina', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 16: Gabriel Jesus (Brazilian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_016', 'Gabriel Jesus', 'dummy_ss_016', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_016', 'BP_SS_016', active_season_id, 'SS', 83, 'Brazil', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 17: Cody Gakpo (Dutch SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_017', 'Cody Gakpo', 'dummy_ss_017', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_017', 'BP_SS_017', active_season_id, 'SS', 82, 'Netherlands', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 18: Marcus Rashford (English SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_018', 'Marcus Rashford', 'dummy_ss_018', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_018', 'BP_SS_018', active_season_id, 'SS', 85, 'England', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 19: Ferran Torres (Spanish SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_019', 'Ferran Torres', 'dummy_ss_019', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_019', 'BP_SS_019', active_season_id, 'SS', 82, 'Spain', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 20: Moussa Diaby (French SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_020', 'Moussa Diaby', 'dummy_ss_020', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_020', 'BP_SS_020', active_season_id, 'SS', 81, 'France', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 21: Randal Kolo Muani (French SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_021', 'Randal Kolo Muani', 'dummy_ss_021', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_021', 'BP_SS_021', active_season_id, 'SS', 83, 'France', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 22: Gonçalo Ramos (Portuguese SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_022', 'Gonçalo Ramos', 'dummy_ss_022', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_022', 'BP_SS_022', active_season_id, 'SS', 81, 'Portugal', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 23: Bukayo Saka (English SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_023', 'Bukayo Saka', 'dummy_ss_023', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_023', 'BP_SS_023', active_season_id, 'SS', 86, 'England', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 24: Phil Foden (English SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_024', 'Phil Foden', 'dummy_ss_024', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_024', 'BP_SS_024', active_season_id, 'SS', 85, 'England', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 25: Florian Wirtz (German SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_025', 'Florian Wirtz', 'dummy_ss_025', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_025', 'BP_SS_025', active_season_id, 'SS', 84, 'Germany', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 26: Ansu Fati (Spanish SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_026', 'Ansu Fati', 'dummy_ss_026', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_026', 'BP_SS_026', active_season_id, 'SS', 80, 'Spain', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 27: Alejandro Garnacho (Argentine SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_027', 'Alejandro Garnacho', 'dummy_ss_027', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_027', 'BP_SS_027', active_season_id, 'SS', 79, 'Argentina', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 28: Nico Williams (Spanish SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_028', 'Nico Williams', 'dummy_ss_028', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_028', 'BP_SS_028', active_season_id, 'SS', 81, 'Spain', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 29: Xavi Simons (Dutch SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_029', 'Xavi Simons', 'dummy_ss_029', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_029', 'BP_SS_029', active_season_id, 'SS', 82, 'Netherlands', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 30: Jude Bellingham (English SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_030', 'Jude Bellingham', 'dummy_ss_030', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_030', 'BP_SS_030', active_season_id, 'SS', 88, 'England', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 31: Vinícius Júnior (Brazilian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_031', 'Vinícius Júnior', 'dummy_ss_031', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_031', 'BP_SS_031', active_season_id, 'SS', 89, 'Brazil', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 32: Rodrygo (Brazilian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_032', 'Rodrygo', 'dummy_ss_032', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_032', 'BP_SS_032', active_season_id, 'SS', 84, 'Brazil', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Player 33: Federico Chiesa (Italian SS)
    INSERT INTO base_players (id, name, player_id, "photoUrl", "createdAt", "updatedAt")
    VALUES ('BP_SS_033', 'Federico Chiesa', 'dummy_ss_033', 'https://cdn.sofifa.net/players/default.png', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO seasonal_player_stats (id, "basePlayerId", "seasonId", position, "overallRating", nationality, "realWorldClub", "createdAt", "updatedAt")
    VALUES ('SPS_SS_033', 'BP_SS_033', active_season_id, 'SS', 83, 'Italy', 'Free Agent', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Successfully added 30 additional SS players to season: %', active_season_id;
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
WHERE bp.id LIKE 'BP_SS_%'
ORDER BY sps."overallRating" DESC;
