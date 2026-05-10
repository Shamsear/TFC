-- Add 3 dummy SS (Second Striker) players for testing

-- First, get the active season ID (you may need to adjust this)
-- Assuming season ID format like 'S001', 'S002', etc.

-- Player 1: Marco Rossi (Italian SS)
INSERT INTO base_players (id, name, player_id, photo_url)
VALUES (
  'BP_SS_001',
  'Marco Rossi',
  'dummy_ss_001',
  'https://cdn.sofifa.net/players/default.png'
);

-- Player 2: Lucas Silva (Brazilian SS)
INSERT INTO base_players (id, name, player_id, photo_url)
VALUES (
  'BP_SS_002',
  'Lucas Silva',
  'dummy_ss_002',
  'https://cdn.sofifa.net/players/default.png'
);

-- Player 3: Ahmed Hassan (Egyptian SS)
INSERT INTO base_players (id, name, player_id, photo_url)
VALUES (
  'BP_SS_003',
  'Ahmed Hassan',
  'dummy_ss_003',
  'https://cdn.sofifa.net/players/default.png'
);

-- Add seasonal stats for these players
-- You'll need to replace 'YOUR_SEASON_ID' with your actual active season ID
-- Example: UPDATE below with actual season ID

-- Get the active season ID first
DO $$
DECLARE
  active_season_id TEXT;
BEGIN
  -- Get the active season
  SELECT id INTO active_season_id
  FROM seasons
  WHERE is_active = true
  LIMIT 1;

  -- If no active season, raise error
  IF active_season_id IS NULL THEN
    RAISE EXCEPTION 'No active season found. Please activate a season first.';
  END IF;

  -- Insert seasonal stats for Player 1: Marco Rossi (Attacking SS)
  INSERT INTO seasonal_player_stats (
    id,
    base_player_id,
    season_id,
    position,
    overall_rating,
    nationality,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical
  ) VALUES (
    'SPS_SS_001',
    'BP_SS_001',
    active_season_id,
    'SS',
    85,
    'Italy',
    82,
    88,
    84,
    86,
    45,
    75
  );

  -- Insert seasonal stats for Player 2: Lucas Silva (Creative SS)
  INSERT INTO seasonal_player_stats (
    id,
    base_player_id,
    season_id,
    position,
    overall_rating,
    nationality,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical
  ) VALUES (
    'SPS_SS_002',
    'BP_SS_002',
    active_season_id,
    'SS',
    83,
    'Brazil',
    85,
    82,
    88,
    89,
    40,
    70
  );

  -- Insert seasonal stats for Player 3: Ahmed Hassan (Physical SS)
  INSERT INTO seasonal_player_stats (
    id,
    base_player_id,
    season_id,
    position,
    overall_rating,
    nationality,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical
  ) VALUES (
    'SPS_SS_003',
    'BP_SS_003',
    active_season_id,
    'SS',
    81,
    'Egypt',
    80,
    84,
    78,
    80,
    48,
    82
  );

  RAISE NOTICE 'Successfully added 3 SS players to season: %', active_season_id;
END $$;

-- Verify the insertion
SELECT 
  bp.id,
  bp.name,
  sps.position,
  sps.overall_rating,
  sps.nationality,
  s.name as season_name
FROM base_players bp
JOIN seasonal_player_stats sps ON bp.id = sps.base_player_id
JOIN seasons s ON sps.season_id = s.id
WHERE bp.id IN ('BP_SS_001', 'BP_SS_002', 'BP_SS_003')
ORDER BY sps.overall_rating DESC;
