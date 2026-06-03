# News Playoff Context Fix - Complete

## Problem
News articles were mentioning playoffs even for pure league tournaments (LEAGUE_ONLY) that don't have any playoff/knockout stages.

Example inappropriate content:
- "helps [Team] secure their playoff position"
- "brings [Team] closer to the playoff spots"

This happened because the tournament context system was calculating playoff positions for all tournament types.

## Root Cause
The `getTournamentContext` function in `lib/news/tournament-context.ts` was calculating playoff positions based on `hasKnockoutStage` flag, but this was being set for `LEAGUE_PLAYOFF` and `GROUP_KNOCKOUT` only. However, the impact analysis in news generation scripts wasn't checking if playoffs actually exist before mentioning them.

## Solution

### 1. Tournament Context Enhancement
Added comment clarification in `lib/news/tournament-context.ts` to emphasize that playoff calculations only happen when `hasKnockoutStage` is true:

```typescript
// Only calculate playoff context if tournament actually has knockouts/playoffs
if (!isPureKnockout && hasKnockoutStage) {
  // ... playoff calculations
}
```

### 2. Impact Analysis Updates
Updated all news generation locations to check `hasKnockoutStage` before mentioning playoffs:

**Before:**
```typescript
if (winnerContext.context.isInPlayoffs) {
  contextString += `helps ${winner} secure their playoff position`;
} else {
  contextString += `brings ${winner} closer to the playoff spots`;
}
```

**After:**
```typescript
if (winnerContext.context.hasKnockoutStage && winnerContext.context.isInPlayoffs) {
  contextString += `helps ${winner} secure their playoff position`;
} else if (winnerContext.context.hasKnockoutStage && !winnerContext.context.isInPlayoffs) {
  contextString += `brings ${winner} closer to the playoff spots`;
} else {
  // Pure league - focus on position and points
  contextString += `improves ${winner}'s league position and strengthens their points tally`;
}
```

## Files Modified

1. **lib/news/tournament-context.ts**
   - Added clarifying comment about playoff calculation conditions
   - Already had correct `hasKnockoutStage` check logic in `generateContextNarrative`

2. **scripts/generate-match-news.ts**
   - Updated impact analysis to check `hasKnockoutStage` before playoff mentions
   - Added fallback text for pure league tournaments

3. **app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts**
   - Updated auto-news generation on match completion
   - Now checks tournament type before playoff references

4. **scripts/regenerate-matchday1-news.ts**
   - Updated batch regeneration script
   - Consistent playoff checking logic

## Tournament Types

- **LEAGUE_ONLY**: Pure league format, no playoffs → No playoff mentions
- **LEAGUE_PLAYOFF**: League followed by playoffs → Playoff mentions OK
- **GROUP_KNOCKOUT**: Groups then knockout → Playoff mentions OK  
- **KNOCKOUT_ONLY**: Pure knockout → No league/playoff context at all

## Testing
After this fix, news articles for LEAGUE_ONLY tournaments will say:
- ✅ "improves [Team]'s league position and strengthens their points tally"
- ✅ "Chasing [Team] (X points ahead)" (from `generateContextNarrative`)

Instead of:
- ❌ "helps [Team] secure their playoff position"
- ❌ "brings [Team] closer to the playoff spots"

## Build Status
✅ All changes compile successfully
✅ TypeScript validation passed
✅ Ready for deployment
