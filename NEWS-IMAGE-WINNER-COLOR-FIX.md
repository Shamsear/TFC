# News Image Generator - Winner Color Fix

## Issue
Match result poster images were always using the home team (left side) color for the background gradient and visual theme, regardless of which team won the match.

## Solution
Updated the image generator to use the **winning team's color** for match result posters.

## Changes Made

### File: `lib/news/image-generator.ts`

**Function:** `generateMatchResultTemplate()` (Lines ~439-490)

### Before:
```typescript
// Determine primary color (use home team's color or default)
const defaultColor = '#00e5ff';
const primaryColor = homeTeamData?.primaryColor && 
                     homeTeamData.primaryColor !== '' && 
                     homeTeamData.primaryColor.startsWith('#') &&
                     homeTeamData.primaryColor.toLowerCase() !== '#00e5ff'
  ? homeTeamData.primaryColor 
  : defaultColor;
```

### After:
```typescript
// Determine winner
const homeScore = metadata.home_score ?? 0;
const awayScore = metadata.away_score ?? 0;
const homeWins = homeScore > awayScore;
const awayWins = awayScore > homeScore;
const isDraw = homeScore === awayScore;

// Determine primary color - use WINNING team's color, fallback to home team, then default
const defaultColor = '#00e5ff';
let primaryColor = defaultColor;

if (!isDraw) {
  // Use winner's color
  const winnerTeamData = homeWins ? homeTeamData : awayTeamData;
  if (winnerTeamData?.primaryColor && 
      winnerTeamData.primaryColor !== '' && 
      winnerTeamData.primaryColor.startsWith('#') &&
      winnerTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
    primaryColor = winnerTeamData.primaryColor;
  } else if (homeTeamData?.primaryColor && 
             homeTeamData.primaryColor !== '' && 
             homeTeamData.primaryColor.startsWith('#') &&
             homeTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
    // Fallback to home team if winner has no color
    primaryColor = homeTeamData.primaryColor;
  }
} else {
  // For draws, prefer home team color
  if (homeTeamData?.primaryColor && 
      homeTeamData.primaryColor !== '' && 
      homeTeamData.primaryColor.startsWith('#') &&
      homeTeamData.primaryColor.toLowerCase() !== '#00e5ff') {
    primaryColor = homeTeamData.primaryColor;
  }
}
```

## Behavior

### Match Results:
- ✅ **Home team wins** → Home team color
- ✅ **Away team wins** → Away team color (FIXED!)
- ✅ **Draw** → Home team color (neutral choice)

### Fallback Logic:
1. Try winner's `primaryColor`
2. If winner has no color, fallback to home team's `primaryColor`
3. If no colors available, use default cyan (`#00e5ff`)

### Color Validation:
- Must start with `#` (valid hex)
- Must not be empty
- Must not be the default cyan color (to ensure unique branding)

## Visual Impact

The primary color affects:
- **Background gradient** - Main canvas background
- **Glow orbs** - Decorative light effects
- **Score text** - The large center score display
- **Event badge** - Some event type badges
- **Shadow effects** - Text glow/shadow colors

## Testing

To verify the fix:
1. Complete a match where the **away team wins**
2. Check the generated news poster
3. Verify the background uses the **away team's color** (not home team)
4. Test a draw to confirm it uses home team color
5. Test teams without colors to ensure fallback works

## Notes

- Away team logo placement remains unchanged (right side)
- Home team logo placement remains unchanged (left side)
- Only the color theme changes based on winner
- Draw matches default to home team color for consistency
- Color validation ensures valid hex colors are used
