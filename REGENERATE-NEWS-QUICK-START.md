# Quick Start: Regenerate Matchday 1 News

## ⚠️ IMPORTANT: Backup First (Optional but Recommended)

If you want to keep existing news as backup:
```sql
CREATE TABLE news_backup AS SELECT * FROM news;
```

## Run the Script

```bash
npm run news:regen
```

## What Happens

1. **Deletes** all existing news
2. **Finds** all matchday 1 matches (Round 1, Matchday 1, MD 1, R1)
3. **Generates** match preview news for each match
4. **Generates** match result news for completed matches

## Expected Result

You'll see output like:
```
🗑️  Deleted 45 news articles
🔍 Found 10 matchday 1 matches
📰 Generated 10 match preview articles
📰 Generated 8 match result articles
✅ COMPLETE! Total: 18 articles
```

## Check Results

### In Database
```sql
SELECT COUNT(*) FROM news;
SELECT * FROM news ORDER BY published_at DESC LIMIT 5;
```

### In App
- Public: http://localhost:3000/news
- Team: http://localhost:3000/team/news
- Admin: http://localhost:3000/super-admin/news

## Restore Backup (If Needed)

```sql
DELETE FROM news;
INSERT INTO news SELECT * FROM news_backup;
```

## Troubleshooting

### "No matchday 1 matches found"
- Check if your round names match: "Round 1", "Matchday 1", "MD 1", or "R1"
- Edit the script if you use different naming

### "Failed to generate ML news content"
- Check `.env` has valid `GEMINI_API_KEY`
- Verify API quota not exceeded

### Script hangs
- Press Ctrl+C to cancel
- Check network connection
- Verify Gemini API is accessible

## Done!

Your matchday 1 news should now be regenerated with full tournament context (standings, form, playoff positions, stakes analysis).
