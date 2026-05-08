-- Add all missing columns to seasonal_player_stats table

-- Player Info columns
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS foot TEXT,
ADD COLUMN IF NOT EXISTS featured TEXT,
ADD COLUMN IF NOT EXISTS weak_foot_usage TEXT,
ADD COLUMN IF NOT EXISTS weak_foot_accuracy TEXT,
ADD COLUMN IF NOT EXISTS form TEXT,
ADD COLUMN IF NOT EXISTS injury_resistance TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS max_level INTEGER,
ADD COLUMN IF NOT EXISTS overall_at_max_level INTEGER;

-- Dribbling Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS scissors_feint TEXT,
ADD COLUMN IF NOT EXISTS double_touch TEXT,
ADD COLUMN IF NOT EXISTS flip_flap TEXT,
ADD COLUMN IF NOT EXISTS marseille_turn TEXT,
ADD COLUMN IF NOT EXISTS sombrero TEXT,
ADD COLUMN IF NOT EXISTS chop_turn TEXT,
ADD COLUMN IF NOT EXISTS cut_behind_turn TEXT,
ADD COLUMN IF NOT EXISTS scotch_move TEXT,
ADD COLUMN IF NOT EXISTS sole_control TEXT,
ADD COLUMN IF NOT EXISTS momentum_dribbling TEXT,
ADD COLUMN IF NOT EXISTS acceleration_burst TEXT,
ADD COLUMN IF NOT EXISTS magnetic_feet TEXT;

-- Heading Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS heading_skill TEXT,
ADD COLUMN IF NOT EXISTS bullet_header TEXT;

-- Shooting Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS long_range_curler TEXT,
ADD COLUMN IF NOT EXISTS blitz_curler TEXT,
ADD COLUMN IF NOT EXISTS chip_shot_control TEXT,
ADD COLUMN IF NOT EXISTS knuckle_shot TEXT,
ADD COLUMN IF NOT EXISTS dipping_shot TEXT,
ADD COLUMN IF NOT EXISTS rising_shot TEXT,
ADD COLUMN IF NOT EXISTS long_range_shooting TEXT,
ADD COLUMN IF NOT EXISTS low_screamer TEXT,
ADD COLUMN IF NOT EXISTS acrobatic_finishing TEXT,
ADD COLUMN IF NOT EXISTS heel_trick TEXT,
ADD COLUMN IF NOT EXISTS first_time_shot TEXT,
ADD COLUMN IF NOT EXISTS phenomenal_finishing TEXT,
ADD COLUMN IF NOT EXISTS willpower TEXT;

-- Passing Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS one_touch_pass TEXT,
ADD COLUMN IF NOT EXISTS through_passing TEXT,
ADD COLUMN IF NOT EXISTS weighted_pass TEXT,
ADD COLUMN IF NOT EXISTS pinpoint_crossing TEXT,
ADD COLUMN IF NOT EXISTS edged_crossing TEXT,
ADD COLUMN IF NOT EXISTS outside_curler TEXT,
ADD COLUMN IF NOT EXISTS rabona TEXT,
ADD COLUMN IF NOT EXISTS no_look_pass TEXT,
ADD COLUMN IF NOT EXISTS game_changing_pass TEXT,
ADD COLUMN IF NOT EXISTS visionary_pass TEXT,
ADD COLUMN IF NOT EXISTS phenomenal_pass TEXT,
ADD COLUMN IF NOT EXISTS low_lofted_pass TEXT;

-- Goalkeeper Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS gk_low_punt TEXT,
ADD COLUMN IF NOT EXISTS gk_high_punt TEXT,
ADD COLUMN IF NOT EXISTS long_throw TEXT,
ADD COLUMN IF NOT EXISTS gk_long_throw TEXT,
ADD COLUMN IF NOT EXISTS penalty_specialist TEXT,
ADD COLUMN IF NOT EXISTS gk_penalty_saver TEXT,
ADD COLUMN IF NOT EXISTS gk_directing_defence TEXT,
ADD COLUMN IF NOT EXISTS gk_spirit_roar TEXT;

-- Defensive Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS gamesmanship TEXT,
ADD COLUMN IF NOT EXISTS man_marking TEXT,
ADD COLUMN IF NOT EXISTS track_back TEXT,
ADD COLUMN IF NOT EXISTS interception TEXT,
ADD COLUMN IF NOT EXISTS blocker TEXT,
ADD COLUMN IF NOT EXISTS aerial_superiority TEXT,
ADD COLUMN IF NOT EXISTS sliding_tackle TEXT,
ADD COLUMN IF NOT EXISTS long_reach_tackle TEXT,
ADD COLUMN IF NOT EXISTS fortress TEXT,
ADD COLUMN IF NOT EXISTS acrobatic_clearance TEXT,
ADD COLUMN IF NOT EXISTS aerial_fort TEXT;

-- Special Skills
ALTER TABLE seasonal_player_stats 
ADD COLUMN IF NOT EXISTS captaincy TEXT,
ADD COLUMN IF NOT EXISTS attack_trigger TEXT,
ADD COLUMN IF NOT EXISTS super_sub TEXT,
ADD COLUMN IF NOT EXISTS fighting_spirit TEXT,
ADD COLUMN IF NOT EXISTS trickster TEXT,
ADD COLUMN IF NOT EXISTS mazing_run TEXT,
ADD COLUMN IF NOT EXISTS speeding_bullet TEXT,
ADD COLUMN IF NOT EXISTS incisive_run TEXT,
ADD COLUMN IF NOT EXISTS long_ball_expert TEXT,
ADD COLUMN IF NOT EXISTS early_cross TEXT,
ADD COLUMN IF NOT EXISTS long_ranger TEXT;
