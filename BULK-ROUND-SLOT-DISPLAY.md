# Bulk Round Slot Display Feature

## Overview
Added team slot information display for bulk rounds on the admin round detail page. Shows each team's selected players count and remaining available slots.

## Changes Made

### 1. Backend - Admin Round Page
**File**: `app/(admin)/sub-admin/[seasonId]/auction/rounds/[roundId]/page.tsx`

- Fetched squad sizes for all teams in the season (counting only ACTIVE players)
- Created a squad size map (teamId → squadSize)
- Passed the squad size data to the client component

```typescript
// Get squad sizes for all teams (only ACTIVE players)
const teamSquadSizes = await Promise.all(
  seasonTeams.map(async (st) => {
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId: st.team.id,
        seasonId,
        status: 'ACTIVE'
      }
    })
    return {
      teamId: st.team.id,
      squadSize
    }
  })
)

const squadSizeMap = new Map(teamSquadSizes.map(s => [s.teamId, s.squadSize]))
```

### 2. Frontend - Round Detail Client Component
**File**: `components/auction/RoundDetailClient.tsx`

- Added `teamSquadSizes` prop to component interface
- Updated bulk round display to show slot information
- Display format: `{selected}/{remaining}` with explanatory text

**Display Logic**:
```typescript
const currentSquadSize = teamSquadSizes?.[team.id] || 0
const maxSquadSize = 25 // Default max squad size
const remainingSlots = Math.max(0, maxSquadSize - currentSquadSize)
```

**UI Display**:
- Shows: `0/7` (0 selected, 7 slots available)
- Format: `{selectedCount}/{remainingSlots}`
- Additional text: "({selectedCount} selected, {remainingSlots} slots)"

## Display Examples

### Team with No Selections
```
Team Name    0/7 (7 slots available)    [Not Started]
```

### Team with Selections In Progress
```
Team Name    3/7 (3 selected, 7 slots)    [In Progress]
```

### Team with Submitted Selections
```
Team Name    5/7 (5 selected, 7 slots)    [Submitted]
```

## Features
- ✅ Shows selected player count
- ✅ Shows remaining available slots
- ✅ Calculates based on current ACTIVE squad size
- ✅ Works for all bulk round statuses (active, pending, completed)
- ✅ Color-coded display (cyan for numbers, gray for explanatory text)
- ✅ Responsive layout
- ✅ WhatsApp copy message includes slot information for bulk rounds

## WhatsApp Copy Message Format

### Bulk Round Format
```
*TFC Round 21 - Submission Status*

*Submitted (3):*
- Team A: 5/7
- Team B: 3/10
- Team C: 6/5

*In Progress (2):*
- Team D: 2/8
- Team E: 1/12

*Not Started (1):*
- Team F: 0/15
```

### Normal Round Format (Unchanged)
```
*TFC Round 21 - Submission Status*

*Submitted (3):*
- Team A
- Team B
- Team C

*In Progress (2):*
- Team D (5 bids)
- Team E (3 bids)

*Not Started (1):*
- Team F
```

## Technical Details

### Squad Size Calculation
- Counts only ACTIVE players in transfer_history
- Filters by teamId and seasonId
- Excludes RELEASED, SOLD, and other non-active statuses

### Remaining Slots Calculation
```typescript
remainingSlots = max(0, maxSquadSize - currentSquadSize)
```

### Max Squad Size
- Currently hardcoded to 25 (default)
- Can be made dynamic by fetching from auction_settings or season_teams table

## Future Enhancements
- [ ] Fetch max squad size from database (team-specific or season-specific)
- [ ] Show min squad size requirement
- [ ] Color-code based on whether team needs to select more players
- [ ] Add tooltip with detailed squad information

## Testing
- [x] No TypeScript errors
- [x] Component accepts new prop
- [x] Display logic calculates correctly
- [ ] Visual verification on admin round page
- [ ] Test with different squad sizes
- [ ] Test with teams at different selection stages

## Related Files
- `app/(admin)/sub-admin/[seasonId]/auction/rounds/[roundId]/page.tsx` - Server component
- `components/auction/RoundDetailClient.tsx` - Client component
- `SQUAD-SIZE-FIX-COMPLETE.md` - Related squad counting fix

## Status
✅ **COMPLETE** - Feature implemented and ready for testing
