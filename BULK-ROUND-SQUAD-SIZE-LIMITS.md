# Bulk Round Squad Size Limits

## Summary
Updated bulk round selection to use squad size requirements instead of `maxBidsPerTeam` limit. Teams can now select the number of players they need to reach the minimum squad size.

## Changes Made

### 1. Bulk Round Page
**File:** `app/(team)/team/auction/bulk-rounds/[id]/page.tsx`

- Added squad size calculation
- Pass `squadSize` and `minSquadSize` (16) to the client component

### 2. Bulk Round Selection Component
**File:** `components/team-auction/BulkRoundSelectionClient.tsx`

#### Props Added
- `squadSize: number` - Current number of players in team's squad
- `minSquadSize: number` - Minimum required squad size (16)

#### Selection Logic Updated
- Removed `maxBidsPerTeam` limit check
- Calculate slots needed: `minSquadSize - squadSize`
- Allow selections up to the number of slots needed
- Show clear message: "You can select up to X players (to reach minimum squad size of 16)"

#### UI Updates
- Changed "Budget" stat to "Current Squad" showing `squadSize / minSquadSize`
- Changed "Selected" stat to show `selections.length / slotsNeeded`
- More intuitive display of how many players the team needs

## How It Works

### Example Scenario
- Team has 10 players in squad
- Minimum squad size is 16
- Slots needed: 16 - 10 = 6
- Team can select up to 6 players in the bulk round

### Display
```
Current Squad: 10 / 16
Selected: 3 / 6
Price Each: £10
Status: Draft
```

## Validation Points

### Frontend (Client Component)
- Prevents selecting more than needed slots
- Shows clear error message when limit reached

### Backend Validation

#### Bulk Finalization (`lib/auction/finalize-bulk-round.ts`)
✅ **Does NOT check `maxBidsPerTeam`**
- Only validates budget using reserve calculator
- Uses `calculateReserve(currentBudget, squadSize)` to ensure team can afford selections
- Reserve calculator ensures teams keep enough budget for remaining squad slots

#### Bulk Tiebreaker (`lib/auction/finalize-bulk-tiebreaker.ts`)
✅ **Does NOT check `maxBidsPerTeam`**
- Only validates:
  - Bid amount meets minimum
  - Team has sufficient budget
- No artificial selection limits

## Reserve Calculator Integration

The system uses `calculateReserve()` to ensure teams maintain enough budget:

```typescript
const reserve = calculateReserve(currentBudget, squadSize, minSquadSize = 16, minPlayerPrice = 5000)
```

This ensures:
- Teams can't spend all their budget if they still need players
- Minimum budget is reserved: `(minSquadSize - squadSize) × minPlayerPrice`
- Teams can only select players they can afford while maintaining reserves

## Testing Scenarios

1. **Team with 10 players**
   - Can select up to 6 players
   - Must have budget for all selections plus reserves

2. **Team with 15 players**
   - Can select up to 1 player
   - Nearly at minimum squad size

3. **Team with 16+ players**
   - Can select 0 players (already at minimum)
   - Should not see bulk round as active

4. **Budget constraints**
   - Even if team needs 6 players, they can only select what they can afford
   - Reserve calculator prevents overspending

## Related Files

- `lib/auction/reserve-calculator.ts` - Budget reserve calculations
- `app/api/team/bulk-rounds/[id]/select/route.ts` - Selection submission API
- `app/api/admin/bulk-tiebreakers/route.ts` - Tiebreaker creation
- `app/api/team/bulk-tiebreakers/[id]/bid/route.ts` - Tiebreaker bidding
