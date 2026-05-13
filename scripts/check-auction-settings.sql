-- Check if auction_settings table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'auction_settings'
ORDER BY ordinal_position;
