# Duplicate Detection Fix

## Issue
Duplicate players within the same uploaded database file were not being detected. For example:
- **Théo Hernández** (ID: 16888468) - Al Hilal SFC
- **Théo Hernández** (ID: 111252) - Free Agents

Both players have the same name and position (DEF) but different IDs and teams.

## Root Cause
The original duplicate detection only checked against existing players in the database, not against other players within the same uploaded file.

## Solution
Updated the preview API (`app/api/import/preview/route.ts`) to perform **two-phase duplicate detection**:

### Phase 1: Within-File Duplicates
- Groups all players from uploaded file by `name + position`
- Flags any groups with 2+ players as duplicates
- Example: Both Théo Hernández players are now flagged

### Phase 2: Database Duplicates
- Compares remaining players against existing database
- Checks for exact name + position matches
- Only runs if player wasn't already flagged in Phase 1

## Changes Made

### 1. Updated Interface
```typescript
export interface DuplicateInfo {
  playerId: string;
  playerName: string;
  position: string;
  existingCount: number;
  existingPlayers: Array<{
    id: string;
    name: string;
    team: string;
    rating: number;
    position: string;
  }>;
  reason: string;
}
```

### 2. Enhanced Detection Logic
- Creates a map of players by `name|position` key
- Identifies groups with multiple entries
- Marks all players in duplicate groups
- Provides detailed information about conflicting players

### 3. Improved Change Detection
Added comparison for all detailed stats:
- nationality
- playingStyle
- offensiveAwareness
- ballControl
- dribbling
- speed
- acceleration
- finishing
- lowPass
- defensiveAwareness
- tackling

## How It Works Now

### Example: Théo Hernández Case
1. **File Upload**: Database contains 2 Théo Hernández players
2. **Grouping**: Both grouped under key `"théo hernández|def"`
3. **Detection**: Group has 2 players → flagged as duplicates
4. **Display**: Both shown in Duplicates tab with warning
5. **Resolution**: User chooses action for each:
   - **Skip**: Don't import either
   - **Replace**: Update existing with new stats
   - **Add Anyway**: Import both as separate players

### Duplicate Card Display
```
⚠️ Duplicate Player Detected
Found 1 other player(s) with same name and position

NEW PLAYER                    EXISTING IN FILE
Théo Hernández               Théo Hernández
Al Hilal SFC                 Free Agents
ID: 16888468                 ID: 111252
Rating: 80                   Rating: 80
Position: LB                 Position: LB
```

## Benefits

1. **Prevents Accidental Duplicates**: Catches same-name players before import
2. **User Control**: User decides how to handle each duplicate
3. **Clear Information**: Shows all conflicting players with details
4. **Flexible Resolution**: Skip, replace, or add options
5. **Database Integrity**: Maintains clean player data

## Testing

### Test Case 1: Within-File Duplicates
- Upload database with duplicate players
- Navigate to Duplicates tab
- Verify both players shown
- Test each resolution option

### Test Case 2: Database Duplicates
- Import player once
- Upload same database again
- Verify player flagged as duplicate
- Test replace vs skip

### Test Case 3: No Duplicates
- Upload database with unique players
- Verify Duplicates tab shows 0
- Verify all players in New tab

## Edge Cases Handled

1. **Case Sensitivity**: Names compared in lowercase
2. **Multiple Duplicates**: Handles 3+ players with same name
3. **Different Teams**: Same player at different clubs detected
4. **Position Changes**: Only flags if position also matches
5. **Mixed Duplicates**: Some in file, some in database

## Performance Impact

- **Minimal**: O(n) grouping operation
- **Fast**: Map-based lookups
- **Scalable**: Works with 3,275+ players
- **Memory**: Efficient Set-based tracking

## Future Enhancements

1. **Fuzzy Matching**: Detect similar names (e.g., "Theo" vs "Théo")
2. **Smart Suggestions**: Recommend resolution based on ratings
3. **Bulk Resolution**: Apply same action to all duplicates
4. **History Tracking**: Log duplicate resolutions
5. **Merge Option**: Combine stats from multiple entries

## Related Files

- `app/api/import/preview/route.ts` - Detection logic
- `components/import/DuplicateResolver.tsx` - UI component
- `components/import/PlayerPreviewList.tsx` - Tab display
- `app/api/import/confirm/route.ts` - Resolution processing

---

**Fixed:** April 30, 2026
**Status:** Complete and tested
**Impact:** All duplicate scenarios now detected correctly
