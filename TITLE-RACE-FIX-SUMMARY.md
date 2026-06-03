# Title Race Detection Fix

## Problem
- The `title_race_heating` scenario was triggering for almost every match early in the season
- Teams not even in top 5 were getting "title race" news articles
- Only 8% tournament completion but 5 teams shown as "contenders"

## Root Causes
1. **No tournament progress consideration**: Logic didn't check how far into the season it was
2. **Too lenient conditions**: Only needed 2+ teams within 5 points (happens early season)
3. **Wrong contender selection**: Included leader but checked wrong teams for title race

## Solution Implemented

### 1. Dynamic Points Threshold Based on Progress
```typescript
// Early season (0-30%): Very tight race required (3 points = 1 game)
if (tournamentProgress <= 30) {
  pointsThreshold = 3;
}
// Mid season (30-60%): Slightly wider (5 points)
else if (tournamentProgress <= 60) {
  pointsThreshold = 5;
}
// Late season (60%+): Even 6-9 points can be title race
else {
  pointsThreshold = 6;
}
```

### 2. Stricter Title Race Conditions
Title race is "heated" only if ONE of these conditions is met:
- **Option 1**: Tournament is >50% complete AND 3+ teams within threshold
- **Option 2**: Tournament is >70% complete AND 2+ teams within threshold (late drama)
- **Option 3**: Top 3 teams all within 1 point AND tournament >30% complete (tight race)

### 3. Better Contender Selection
- Now includes ALL teams within threshold (including leader)
- Previously excluded leader which caused confusion when multiple teams tied

## Before vs After

### BEFORE (Matchday 3, 8% complete)
```
Event Type: title_race_heating
Contenders:
  - Leicester City (9 pts, gap: 0)
  - Arsenal (9 pts, gap: 0)
  - Borussia Dortmund (9 pts, gap: 0)
  - Sunderland (6 pts, gap: 3)
  - Boca Juniors (6 pts, gap: 3)
```
❌ Manchester United (17th position) getting title race news!

### AFTER (Matchday 3, 8% complete)
```
Event Type: manager_first_match
Scenario: Manager's first win
```
✅ More appropriate scenario for early season!

## Other Improvements
- Reduced winless drought threshold from 5 to 3 matches (more relevant early season)
- Fixed standings synchronization issue (Leicester now correctly shown as 1st)
- Added tournament progress context to title race detection

## When Title Race Will Trigger Now

### Early Season (0-30%)
- Only if top 3 teams are within 1 point of each other
- Very rare, requires extremely close competition

### Mid Season (30-70%)
- Tournament >50% complete + 3+ teams within 3-5 points
- This is when title races genuinely matter

### Late Season (70-100%)
- Tournament >70% complete + 2+ teams within 6 points
- Final stretch drama and championship deciders

## Testing
```bash
# Test early season match (should NOT show title_race_heating)
npx tsx scripts/generate-match-news.ts TFCMA-2673

# Result: manager_first_match ✅
```

## Files Modified
- `lib/news/scenario-detector.ts` - Enhanced checkTitleRace() function
- Added tournament progress calculation
- Implemented dynamic thresholds
- Stricter conditions for heated title races
