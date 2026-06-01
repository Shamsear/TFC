# Badge XP Reduction - Summary

## Changes Made

Reduced badge XP rewards to slow down progression and make levels more meaningful.

### Old vs New Values

| Badge Tier | Old XP | New XP | Reduction |
|------------|--------|--------|-----------|
| Bronze     | 25     | 15     | -40% |
| Silver     | 50     | 30     | -40% |
| Gold       | 100    | 60     | -40% |
| Platinum   | 250    | 150    | -40% |

### Match XP (Unchanged)

| Action | XP |
|--------|-----|
| Match Played | 5 |
| Match Won | 25 |
| Match Drawn | 10 |
| Goal Scored | 2 |

## Impact Examples

### Example 1: Team with Multiple Badges
**Before:**
- 3 Bronze badges: 3 × 25 = 75 XP
- 2 Silver badges: 2 × 50 = 100 XP
- 1 Gold badge: 1 × 100 = 100 XP
- **Total from badges: 275 XP**

**After:**
- 3 Bronze badges: 3 × 15 = 45 XP
- 2 Silver badges: 2 × 30 = 60 XP
- 1 Gold badge: 1 × 60 = 60 XP
- **Total from badges: 165 XP**

**Difference: -110 XP (-40%)**

### Example 2: Platinum Badge Impact
**Before:**
- Golden Boot (Platinum): 250 XP
- Could push a team from Level 1 to Level 2 alone

**After:**
- Golden Boot (Platinum): 150 XP
- Still significant but requires more overall achievement

## Why This Change?

1. **Slower Progression**: Makes reaching higher levels more challenging
2. **Match Performance Matters More**: Badges are now a bonus, not the main XP source
3. **More Balanced**: Prevents teams from jumping levels too quickly from a few badges
4. **Long-term Engagement**: Higher levels feel more earned and prestigious

## Level Thresholds (Unchanged)

- Level 1: 0-399 XP
- Level 2: 400-1,599 XP
- Level 3: 1,600-3,599 XP
- Level 4: 3,600-6,399 XP

## Next Steps

To apply these changes to existing teams:

```bash
# Recalculate all team XP and levels with new values
npx tsx scripts/reset-all-achievements.ts
```

This will:
1. Delete all existing badges and XP history
2. Reset all teams to Level 1
3. Recalculate everything using the new XP values
4. Award badges again with reduced XP

## File Changed

- `lib/achievements-math.ts` - Updated XP_VALUES constant
