-- Publish all news articles
UPDATE news 
SET is_published = true 
WHERE is_published = false;

-- Verify
SELECT 
    COUNT(*) as total_published
FROM news
WHERE is_published = true;
