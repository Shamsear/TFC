# Fix Bulk Round Routing

## Issue
Bulk rounds (like TFCR-5) were showing the normal round bidding page instead of the bulk round selection interface where teams select players for a fixed price (£10) with tiebreakers for conflicts.

## Root Cause
The application has separate pages for normal rounds and bulk rounds:
- Normal rounds: `/team/auction/rounds/[id]`
- Bulk rounds: `/team/auction/bulk-rounds/[id]`

However, the dashboard and team page were hardcoding links to `/team/auction/rounds/[id]` for all rounds, regardless of their `roundType`.

## Changes Made

### 1. Auction Dashboard Component
**File:** `components/team-auction/AuctionDashboardClient.tsx`

#### Active Rounds Section
- Added logic to determine the correct path based on `round.roundType`
- Bulk rounds now link to `/team/auction/bulk-rounds/${round.id}`
- Normal rounds continue to link to `/team/auction/rounds/${round.id}`

#### Completed Rounds Section
- Added logic to determine the correct results path based on `round.roundType`
- Bulk round results link to `/team/auction/bulk-rounds/${round.id}/results`
- Normal round results link to `/team/auction/rounds/${round.id}/results`

### 2. Team Dashboard Page
**File:** `app/(team)/team/page.tsx`

- Added logic to determine the correct path based on `round.roundType`
- Active rounds now route correctly based on their type

### 3. Normal Round Page Guard
**File:** `app/(team)/team/auction/rounds/[id]/page.tsx`

- Added redirect check: if a bulk round is accessed via the normal round URL, it redirects to the bulk round page
- This handles cases where users might have bookmarked or directly accessed the wrong URL

## How It Works

### Round Type Detection
```typescript
const roundPath = round.roundType === 'bulk' 
  ? `/team/auction/bulk-rounds/${round.id}`
  : `/team/auction/rounds/${round.id}`
```

### Redirect Guard
```typescript
// In normal round page
if (round.roundType === 'bulk') {
  redirect(`/team/auction/bulk-rounds/${id}`)
}
```

## Bulk Round vs Normal Round

### Normal Round
- Teams submit sealed bids for multiple players
- Highest bidder wins each player
- Variable pricing based on bids
- URL: `/team/auction/rounds/[id]`

### Bulk Round
- Teams select players they want (priority-based)
- Fixed price per player (e.g., £10)
- Conflicts resolved via bulk tiebreakers
- URL: `/team/auction/bulk-rounds/[id]`

## Testing

To verify the fix:
1. Navigate to the auction dashboard
2. Click on a bulk round (e.g., TFCR-5)
3. Should see the bulk round selection interface with player selection grid
4. Should NOT see the normal round bidding interface

## Related Files

- `app/(team)/team/auction/bulk-rounds/[id]/page.tsx` - Bulk round page (already had proper type check)
- `components/team-auction/BulkRoundSelectionClient.tsx` - Bulk round UI component
- `components/team-auction/NormalRoundBiddingClient.tsx` - Normal round UI component
