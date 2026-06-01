-- Add primary_color column to teams table
ALTER TABLE teams 
ADD COLUMN primary_color VARCHAR(7) DEFAULT '#00e5ff';

-- Update existing teams with a default color
UPDATE teams 
SET primary_color = '#00e5ff' 
WHERE primary_color IS NULL;
