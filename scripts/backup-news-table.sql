-- Backup news table before regeneration
-- Run this BEFORE running the regeneration script

-- Create backup table with all data
CREATE TABLE IF NOT EXISTS news_backup AS 
SELECT * FROM news;

-- Verify backup
SELECT 
  'Original' as source, 
  COUNT(*) as count 
FROM news
UNION ALL
SELECT 
  'Backup' as source, 
  COUNT(*) as count 
FROM news_backup;

-- To restore backup if needed:
-- DELETE FROM news;
-- INSERT INTO news SELECT * FROM news_backup;
