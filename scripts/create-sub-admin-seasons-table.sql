-- ============================================
-- ADD SUB_ADMIN_SEASONS TABLE
-- This table links sub-admins to the seasons they can manage
-- ============================================

-- Create the sub_admin_seasons table
CREATE TABLE IF NOT EXISTS sub_admin_seasons (
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Primary key (composite)
  PRIMARY KEY (user_id, season_id),
  
  -- Foreign key constraints
  CONSTRAINT sub_admin_seasons_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
    
  CONSTRAINT sub_admin_seasons_season_id_fkey 
    FOREIGN KEY (season_id) 
    REFERENCES seasons(id) 
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS sub_admin_seasons_user_id_idx ON sub_admin_seasons(user_id);
CREATE INDEX IF NOT EXISTS sub_admin_seasons_season_id_idx ON sub_admin_seasons(season_id);

-- Add comment
COMMENT ON TABLE sub_admin_seasons IS 'Links sub-admins to the seasons they are authorized to manage';

-- ============================================
-- MIGRATION NOTES
-- ============================================
-- This table is required for sub-admins to access seasons
-- After running this migration, you need to assign seasons to sub-admins
-- You can do this through the Super Admin interface or by running:
-- 
-- INSERT INTO sub_admin_seasons (user_id, season_id, created_at)
-- VALUES ('<sub_admin_user_id>', '<season_id>', NOW());
--
-- Example to assign all seasons to a specific sub-admin:
-- INSERT INTO sub_admin_seasons (user_id, season_id, created_at)
-- SELECT 'TFCU-2', id, NOW() FROM seasons;
