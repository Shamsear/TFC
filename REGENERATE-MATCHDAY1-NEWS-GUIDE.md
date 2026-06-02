# Regenerate Matchday 1 News - Complete Guide

## Overview
This script deletes ALL existing news and regenerates news for matchday 1 matches with full tournament context.

## What It Does

### Step 1: Delete All News
- Removes every news article from the `news` table
- Clean slate for regeneration

### Step 2: Find Matchday 1 Matches
Searches for matches with round names:
- "Round 1"
- "Matchday 1"
- "MD 1"
- "R1"

### Step 3: Generate Match Previews
For EACH matchday 1 match:
- Fetches tournament context for both teams
- Gets current standings, form, playoff positions
- Analyzes stakes (playoff battles, tight races, form comparison)
- Generates AI news with rich context

### Step 4: Generate Match Results
For COMPLETED matchday 1 matches:
- Fetches tournament context for both teams (excluding this match)
- Determines event type (thrashing, close_match, high_scoring, etc.)
- Analyzes impact on standings
- Generates AI news with result + impact

## How to Run

### Option 1: Using npm script (Recommended)
```bash
npm run news:regen
```

### Option 2: Using tsx directly
```bash
npx tsx scripts/regenerate-matchday1-news.ts
```

## Prerequisites

1. **.env file** must have `GEMINI_API_KEY` configured
2. **Prisma** must be generated (`npm run prisma:generate`)
3. **Matchday 1 matches** must exist in database
4. **Tournament standings** should be available

## Expected Output

```
🗑️  Step 1: Deleting all existing news...
   ✅ Deleted 45 news articles

🔍 Step 2: Finding matchday 1 matches...
   ✅ Found 10 matchday 1 matches

📰 Step 3: Generating match preview news...

   Tournament: TFC League
      ✅ Preview: Arsenal vs Manchester United
      ✅ Preview: Liverpool vs Chelsea
      ✅ Preview: Manchester City vs Tottenham
      ...

   📊 Generated 10 match preview articles

📰 Step 4: Generating match completion news...

   Tournament: TFC League - 8 completed
      ✅ Result: Arsenal 2-1 Manchester United
      ✅ Result: Liverpool 3-3 Chelsea
      ⚠️  Skipping City vs Spurs - No scores
      ...

   📊 Generated 8 match result articles

✅ COMPLETE!
   Total articles generated: 18
   - 10 match previews
   - 8 match results
```

## What Gets Generated

### Match Preview Articles
**Event**: `match_started`

**Content Includes**:
- Both teams' current standings
- Recent form (WDLWL format)
- Playoff positions
- Stakes analysis
- Form comparison

**Example Context**:
```
Match Preview Context:

Arsenal: Currently 3rd in TFC League with 15 points from 8 matches. 
Recent form: good (WWDLW). 3 points behind leader Manchester City. 
In playoff positions (top 4).

Manchester United: Currently 5th in TFC League with 12 points from 8 matches. 
Recent form: good (WWLWD). 6 points behind leader Manchester City. 
In playoff positions (top 4).

Stakes: Crucial playoff battle between two top teams. Arsenal in better form recently.
```

### Match Result Articles
**Event**: Varies (`thrashing`, `close_match`, `high_scoring`, `boring_draw`, `penalty_shootout`, `match_completed`)

**Content Includes**:
- Match scoreline
- Both teams' standings AFTER match
- Impact on playoff race
- Form updates

**Example Context**:
```
Tournament Context:

Arsenal: Currently 3rd in TFC League with 18 points from 9 matches. 
Recent form: excellent (WWDLW). 3 points behind leader Manchester City. 
In playoff positions (top 4).

Manchester United: Currently 6th in TFC League with 12 points from 9 matches. 
Recent form: poor (WLDWL). 9 points behind leader Manchester City. 
3 points away from playoff positions.

Impact: This victory helps Arsenal secure their playoff position.
```

## Error Handling

The script will:
- ✅ Continue if individual match news fails
- ✅ Log errors but not crash
- ✅ Show which matches succeeded/failed
- ✅ Always disconnect from Prisma at the end

## Troubleshooting

### "No matchday 1 matches found"
**Solution**: Check your match round names. Update the script's OR conditions if your rounds use different naming.

### "Failed to generate ML news content"
**Possible causes**:
1. Gemini API key missing/invalid
2. API quota exceeded
3. Network issues

**Solution**: Check `.env` file has valid `GEMINI_API_KEY`

### "Skipping match - No scores"
**Explanation**: This is normal for matches that aren't completed yet. Only preview news is generated for these.

### Script hangs or times out
**Possible cause**: Too many matches or API rate limiting

**Solution**: 
1. Add delays between API calls
2. Reduce batch size
3. Run during off-peak hours

## Customization

### To Change Round Detection
Edit the `where` clause in the script:
```typescript
where: {
  OR: [
    { round: 'Round 1' },
    { round: 'Week 1' },      // Add your naming
    { round: 'Gameweek 1' },  // Add your naming
  ]
}
```

### To Generate for Different Rounds
Change the round values:
```typescript
where: {
  OR: [
    { round: 'Round 2' },
    { round: 'Matchday 2' },
  ]
}
```

### To NOT Delete Existing News
Comment out the delete step:
```typescript
// console.log('🗑️  Step 1: Deleting all existing news...');
// const deleteResult = await prisma.news.deleteMany({});
// console.log(`   ✅ Deleted ${deleteResult.count} news articles\n`);
```

## Post-Execution

After running the script:

1. **Check the news table**:
   ```sql
   SELECT COUNT(*) FROM news;
   SELECT category, COUNT(*) FROM news GROUP BY category;
   ```

2. **View in app**:
   - Public: `/news`
   - Team: `/team/news`
   - Admin: `/super-admin/news`

3. **Verify bilingual content**:
   ```sql
   SELECT title_en, title_ml FROM news LIMIT 5;
   ```

## Notes

- The script uses **fire-and-forget** for news generation (doesn't wait for completion)
- Each match generates **TWO** articles (EN + ML are stored together)
- News articles are timestamped with current time, not match date
- Tournament context requires standings data to work properly

## Safety

⚠️ **WARNING**: This script **DELETES ALL NEWS** before regenerating. 

To be safe:
1. Back up your news table first:
   ```sql
   CREATE TABLE news_backup AS SELECT * FROM news;
   ```

2. Or modify script to NOT delete:
   - Comment out the deleteMany() call
   - Only regenerate matchday 1 news

## Success Criteria

✅ Script completes without errors
✅ News count in database matches expected (previews + results)
✅ All articles have both EN and ML content
✅ Categories are correct (match, achievement, etc.)
✅ News visible in public/team/admin pages

## Next Steps

After successful regeneration:
1. Check news pages to verify content quality
2. Test filtering by category
3. Verify bilingual switching works
4. Confirm tournament context appears in articles
