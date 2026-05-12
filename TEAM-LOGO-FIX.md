# Team Logo Display Fix

## Problem
Team logos were being cropped when displayed because they used `object-cover` CSS class, which crops images to fill the container. This caused logos to lose important parts of their design.

## Solution
Changed all team logo displays from `object-cover` to `object-contain` with appropriate padding. This ensures the entire logo is visible without cropping.

## Changes Made

### CSS Class Changes
**Before:** `object-cover`  
**After:** `object-contain` with padding

### Padding Applied
- Small logos (6x6, 8x8): `p-0.5` (2px padding)
- Medium logos (10x10, 12x12): `p-1` (4px padding)
- Large logos (16x16, 20x20, 24x24): `p-2` (8px padding)

### Files Modified

#### Tournament Components
1. **components/tournament/MatchEditor.tsx**
   - Home team logo (large): `object-contain p-2`
   - Away team logo (large): `object-contain p-2`

2. **components/tournament/TournamentFormAdvanced.tsx**
   - Team selection logos: `object-contain p-1`

3. **components/tournament/KnockoutBracket.tsx**
   - Team 1 logo: `object-contain p-1`
   - Team 2 logo: `object-contain p-1`

4. **components/tournament/KnockoutRoundManager.tsx**
   - Team logos in round manager: `object-contain p-1`

5. **components/tournament/TournamentForm.tsx**
   - Team selection logos: `object-contain p-1`

6. **components/tournament/StandingsTable.tsx**
   - Team logos in standings: `object-contain p-1`

7. **components/tournament/GroupsView.tsx**
   - Team logos in groups: `object-contain p-0.5`

8. **components/tournament/FixtureGenerator.tsx**
   - Team logos in fixtures: `object-contain p-0.5`

9. **components/tournament/FixturesList.tsx**
   - Home team logos: `object-contain p-1`
   - Away team logos: `object-contain p-1`

10. **components/tournament/FixtureCalendarEditor.tsx**
    - Home team logos: `object-contain p-1`
    - Away team logos: `object-contain p-1`

#### Player Components
11. **components/players/AllPlayersClient.tsx**
    - Team logos in player cards: `object-contain p-1`

#### Public Pages
12. **app/(public)/auctions/rounds/[roundId]/page.tsx**
    - Team logos in results: `object-contain p-0.5`
    - Added `bg-white/5` background for better visibility

13. **app/(public)/auctions/results/page.tsx**
    - Team logos in results: `object-contain p-0.5`
    - Added `bg-white/5` background for better visibility

## Benefits

### 1. **No Cropping**
- Entire logo is visible
- No important parts cut off
- Maintains logo integrity

### 2. **Consistent Appearance**
- All logos display uniformly
- Proper aspect ratio maintained
- Professional look across the platform

### 3. **Better Visibility**
- Added subtle background (`bg-white/5`) where needed
- Padding prevents logos from touching edges
- Cleaner, more polished appearance

### 4. **Responsive Design**
- Works well on all screen sizes
- Logos scale appropriately
- Maintains quality on mobile and desktop

## Visual Comparison

### Before (object-cover)
```
┌─────────┐
│ ╔═══╗   │  <- Logo cropped
│ ║ L ║   │     at edges
│ ╚═══╝   │
└─────────┘
```

### After (object-contain with padding)
```
┌─────────┐
│         │
│  ╔═══╗  │  <- Full logo
│  ║ L ║  │     visible
│  ╚═══╝  │
│         │
└─────────┘
```

## Testing Checklist

- ✅ Tournament match displays (home/away teams)
- ✅ Tournament standings tables
- ✅ Tournament brackets (knockout rounds)
- ✅ Tournament groups view
- ✅ Fixture lists and calendars
- ✅ Team selection forms
- ✅ Player cards with team info
- ✅ Auction results pages
- ✅ All responsive breakpoints (mobile, tablet, desktop)

## Additional Improvements

### Background Color
Added `bg-white/5` to logo containers where missing to ensure logos are visible against dark backgrounds.

### Container Sizing
Maintained existing container sizes:
- Small: 6x6, 8x8 pixels
- Medium: 10x10, 12x12 pixels
- Large: 16x16, 20x20, 24x24 pixels

### Fallback Icons
Kept existing fallback (⚽ emoji) for teams without logos.

## Notes

- All changes maintain existing responsive behavior
- No breaking changes to component APIs
- Backward compatible with existing team logo URLs
- Works with both square and non-square logos
- Handles transparent and non-transparent logos

## Future Considerations

1. **Logo Guidelines**: Consider creating team logo upload guidelines specifying:
   - Recommended dimensions (e.g., 512x512px)
   - File format (PNG with transparency preferred)
   - Maximum file size
   - Design requirements (clear on dark backgrounds)

2. **Lazy Loading**: Consider adding lazy loading for logo images to improve performance

3. **Placeholder Images**: Consider adding a default placeholder logo for teams without logos instead of emoji

4. **Image Optimization**: Consider using Next.js Image component for automatic optimization where possible
