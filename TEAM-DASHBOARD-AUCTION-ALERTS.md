# Team Dashboard Auction Alerts - Complete

## Overview
Added prominent auction round alerts to the team dashboard to notify teams about active rounds and provide quick access to bidding.

## Changes Made

### 1. Team Dashboard Updates (`app/(team)/team/page.tsx`)

#### Added Active Rounds Query
```typescript
// Get active auction rounds
const activeRounds = await prisma.rounds.findMany({
  where: {
    seasonId: activeSeason.id,
    status: 'active',
    endTime: {
      gte: new Date(), // Only rounds that haven't ended yet
    },
  },
  include: {
    teamRoundBids: {
      where: {
        teamId: team.id,
      },
      select: {
        submitted: true,
        bidCount: true,
      },
    },
  },
  orderBy: {
    endTime: 'asc',
  },
  take: 3,
})
```

#### Added Prominent Alert Section
**Location:** Between stats grid and content grid (highly visible)

**Features:**
- **Animated pulse icon** - Draws attention to active rounds
- **Round count badge** - Shows how many rounds are active
- **Individual round cards** showing:
  - Round number and position
  - "LIVE" badge for active status
  - Remaining time (hours and minutes)
  - Urgent styling when < 2 hours remaining (red text)
  - Team bid status:
    - ✓ Submitted (green) - Shows bid count
    - In Progress (yellow) - Shows bid count
    - Not Started (red)
  - Direct link to round bidding page
- **"View All Auction Rounds" button** - Links to `/team/auction`

#### Updated Quick Actions
- Added "Auction" as the first quick action button
- Links to `/team/auction` (new auction system)
- Uses dollar sign icon to represent bidding

### 2. Auction System Clarification

**Two Separate Systems:**

1. **`/team/auction`** - NEW Optimized Auction System
   - Round-based bidding
   - Real-time active rounds
   - Team bidding interface
   - Tiebreaker system
   - This is what teams use for active auctions

2. **`/team/auctions`** - OLD Auction Calendar/Results
   - Historical auction results
   - Auction calendar view
   - Past player sales
   - Read-only viewing
   - Still useful for reference

Both systems coexist and serve different purposes.

## UI/UX Features

### Visual Hierarchy
1. **Gradient background** - Gold/orange gradient draws attention
2. **Border emphasis** - 2px border with gold color
3. **Animated pulse** - Clock icon pulses to indicate urgency
4. **Color coding:**
   - Green: Submitted bids
   - Yellow: In progress
   - Red: Not started or urgent time remaining

### Responsive Design
- Mobile-friendly layout
- Stacks vertically on small screens
- Adjusts font sizes for readability

### Time Display
- Shows hours and minutes remaining
- Format: "2h 30m" or "45m"
- Red color when < 2 hours (urgent)
- Orange color when > 2 hours (normal)

### Status Indicators
- **LIVE badge** - Green badge shows round is active
- **Bid status badges** - Color-coded status for each team
- **Action text** - "Place Bids" vs "View Bids" based on status

## User Flow

1. **Team logs into dashboard** → Sees active rounds immediately
2. **Clicks on round card** → Goes to bidding page for that round
3. **Places bids** → Status updates to "In Progress"
4. **Submits bids** → Status updates to "✓ Submitted"
5. **Can click "View All"** → Goes to full auction dashboard

## Testing Recommendations

1. **No active rounds:**
   - Alert section should not appear
   - Quick action button still visible

2. **One active round:**
   - Alert shows single round
   - Time remaining displays correctly
   - Status reflects team's bid state

3. **Multiple active rounds:**
   - Shows up to 3 rounds
   - Sorted by end time (soonest first)
   - Each has correct status

4. **Urgent rounds (< 2 hours):**
   - Time displays in red
   - Still functional and clickable

5. **Submitted bids:**
   - Shows green checkmark
   - Displays bid count
   - Link text changes to "View Bids"

## Files Modified
1. `app/(team)/team/page.tsx` - Added active rounds query and alert section

## Build Status
- Changes ready for testing
- No TypeScript errors expected
- Responsive design implemented

## Next Steps
1. Test with actual active rounds
2. Verify time calculations are accurate
3. Test bid status updates in real-time
4. Ensure mobile layout works correctly
