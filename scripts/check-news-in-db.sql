-- Check if news exists in database

SELECT 
    COUNT(*) as total_news,
    COUNT(CASE WHEN is_published = true THEN 1 END) as published_news,
    COUNT(CASE WHEN is_published = false THEN 1 END) as draft_news
FROM news;

-- Show latest 5 news articles
SELECT 
    id,
    title_en,
    category,
    event_type,
    is_published,
    created_at
FROM news
ORDER BY created_at DESC
LIMIT 5;
