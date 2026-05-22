# Copy Bids Feature - Team Auction Results Page

## Summary
Added a "Copy My Bids" button to the team auction results page that allows teams to copy all their bids from a completed round to clipboard in WhatsApp format.

## Changes Made

### 1. Server-Side: `app/(team)/team/auction/rounds/[id]/results/page.tsx`

**Added Player Name Fetching:**
- Created a `Set` to collect all player IDs from bids
- Fetched player names from `base_players` table for all bid players
- Created a `playerNameMap` (Map<string, string>) to store player ID -> name mapping
- Passed `playerNameMap` to the client component

**Why This Was Needed:**
- Previously, player names were only available from the `allocations` array
- `allocations` only contains players who were actually won/allocated
- Players who received bids but weren't won had no name data
- This caused "Unknown Player" to appear in the copy output

### 2. Client-Side: `components/team-auction/RoundResultsClient.tsx`

**Added Copy Functionality:**

1. **New State:**
   - `copied` state to show feedback when bids are copied

2. **New Function: `handleCopyMyBids`:**
   - Iterates through all bids by player
   - Filters to find bids made by the current team
   - Gets player names from either:
     - `allocations` (for won players) - first priority
     - `playerNameMap` (for all bid players) - fallback
     - "Unknown Player" - last resort
   - Calculates summary statistics:
     - Total bids count
     - Players won count
     - Total amount spent
   - Formats message in WhatsApp-friendly format
   - Copies to clipboard

3. **New UI Button:**
   - Added "Copy My Bids" button in the header
   - WhatsApp green styling with icon
   - Shows "Copied!" feedback when clicked
   - Responsive layout (stacks on mobile)

## Message Format

```
*TFC Season 4*

*Round 6 - My Bids*

*Position:* CF

*Summary:*
• Total Bids: 30
• Players Won: 1
• Total Spent: £42

*Bids:*
1. Victor Osimhen - £547
2. Erling Haaland - £531
3. Cristiano Ronaldo - £452
...
14. Gonçalo Ramos - £42 ✓ WON
...
30. Harry Kane - £12
```

## Features

1. **Complete Player Names:**
   - All players now show their actual names
   - No more "Unknown Player" entries
   - Works for both won and lost bids

2. **Summary Statistics:**
   - Total number of bids placed
   - Number of players won
   - Total amount spent on won players

3. **Visual Indicators:**
   - ✓ WON marker for players acquired
   - Sorted by bid amount (highest to lowest)
   - Numbered list for easy reference

4. **WhatsApp Formatting:**
   - Bold headers using asterisks
   - Bullet points for summary
   - Clean, readable format

## Technical Details

### Data Flow
1. Server fetches all team bids and decrypts them
2. Server creates `bidsByPlayer` map (playerId -> array of bids)
3. Server fetches player names for all bid players
4. Server passes both `bidsByPlayer` and `playerNameMap` to client
5. Client combines data from allocations and playerNameMap
6. Client formats and copies to clipboard

### Type Safety
- Updated `RoundResultsClientProps` interface to include `playerNameMap`
- Proper TypeScript types for all data structures
- No type errors

## Testing Recommendations

1. Test with rounds where:
   - Team won some players
   - Team lost all bids
   - Team won all bids
   - Mix of won/lost bids

2. Test player name resolution:
   - Verify all player names appear correctly
   - No "Unknown Player" entries
   - Names match actual players

3. Test copy functionality:
   - Button shows "Copied!" feedback
   - Message format is correct
   - Can paste into WhatsApp
   - Summary statistics are accurate

4. Test responsive design:
   - Mobile view (buttons stack)
   - Tablet view
   - Desktop view

## Notes

- No backend API changes required
- Uses existing bid decryption logic
- Maintains all existing functionality
- Fully backward compatible
- Works with both normal and bulk rounds
