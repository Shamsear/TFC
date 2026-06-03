-- Check if news exists for the "missing" matches

-- TFCMA-2676: Flamengo 1-6 Leicester City
SELECT id, event_type, 
       metadata->>'home_team' as home_team,
       metadata->>'away_team' as away_team,
       metadata->>'home_score' as home_score,
       metadata->>'away_score' as away_score,
       metadata->>'match_id' as match_id
FROM news
WHERE season_id = 'TFCS-4'
  AND (
    (metadata->>'home_team' = 'Flamengo' AND metadata->>'away_team' = 'Leicester City')
    OR (metadata->>'home_team' = 'Leicester City' AND metadata->>'away_team' = 'Flamengo')
  );

-- TFCMA-2674: Santos 2-3 Chelsea
SELECT id, event_type, 
       metadata->>'home_team' as home_team,
       metadata->>'away_team' as away_team,
       metadata->>'home_score' as home_score,
       metadata->>'away_score' as away_score,
       metadata->>'match_id' as match_id
FROM news
WHERE season_id = 'TFCS-4'
  AND (
    (metadata->>'home_team' = 'Santos' AND metadata->>'away_team' = 'Chelsea')
    OR (metadata->>'home_team' = 'Chelsea' AND metadata->>'away_team' = 'Santos')
  );

-- Check all news count
SELECT COUNT(*) as total_news FROM news WHERE season_id = 'TFCS-4';

-- Check match-related news count
SELECT COUNT(*) as match_news FROM news 
WHERE season_id = 'TFCS-4'
  AND event_type IN (
    'match_completed', 'thrashing', 'close_match', 'boring_draw', 
    'high_scoring', 'comeback_victory', 'clean_sheet', 'penalty_shootout',
    'dominant_win', 'thriller', 'goal_fest', 'entertaining_draw', 'draw',
    'match_walkover', 'clean_sheet_master', 'unbeaten_streak', 'losing_streak',
    'goal_fest_h2h', 'manager_first_match', 'perfect_start', 'winless_drought_ends',
    'top_of_table_takeover', 'mid_table_mediocrity', 'basement_battle',
    'giant_slayer', 'century_of_goals', 'defensive_nightmare', 'matchday_opener'
  );
