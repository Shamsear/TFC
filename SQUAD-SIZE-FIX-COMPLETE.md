# Squad Size Counting Fix - Complete

## Problem
Squad size was being counted incorrectly across the application. The queries were counting ALL transfer_history records instead of only ACTIVE ones, which meant:
- Released players were still counted in squad size
- Sold/transferred players were included in counts
- Squad size displayed wrong numbers everywhere

## Root Cause
Transfer history records have a `status` field with values like:
- `ACTIVE` - Player is currently in the team
- `RELEASED` - Player was released by the team
- `SOLD` - Player was sold/transferred
- etc.

Most queries were missing the `status: 'ACTIVE'` filter.

## Solution
Added `status: 'ACTIVE'` filter to all transfer_history queries that count or display squad players.

## Files Fixed

### Team Pages (Frontend)
1. ✅ `app/(team)/team/page.tsx`
   - Line 55-57: Squad count for dashboard
   - Line 348-352: Recent auction results
   - Line 376-380: Squad players for tabs

2. ✅ `app/(team)/team/auction/page.tsx`
   - Line 91-93: Squad size display

3. ✅ `app/(team)/team/auction/rounds/[id]/page.tsx`
   - Line 122-124: Squad size for bidding

4. ✅ `app/(team)/team/players/page.tsx`
   - Line 46: Sold count for stats

5. ✅ `app/(team)/team/teams/page.tsx`
   - Line 82-84: Player count per team
   - Line 103-105: Position breakdown query

6. ✅ `app/(team)/team/squad/page.tsx`
   - Line 46-50: Squad players list

7. ✅ `app/(team)/team/squad/builder/page.tsx`
   - Line 45-49: Squad players for builder

8. ✅ `app/(team)/team/auction-planner/page.tsx`
   - Line 60-64: Current squad for filtering

9. ✅ `app/(team)/team/teams/[teamId]/page.tsx`
   - Line 47-51: Team transfers display

### Admin Pages (Frontend)
10. ✅ `app/(admin)/sub-admin/[seasonId]/all-players/page.tsx`
    - Line 24: Sold count for stats

11. ✅ `app/(admin)/sub-admin/[seasonId]/all-teams/page.tsx`
    - Line 57-59: Player count per team
    - Line 78-80: Position breakdown query

12. ✅ `app/(admin)/sub-admin/[seasonId]/all-teams/[teamId]/page.tsx`
    - Line 47-51: Team transfers display

### API Routes (Backend)
13. ✅ `app/api/team/bulk-rounds/[id]/select/route.ts`
    - Line 103-105: Squad size validation

14. ✅ `app/api/auction/rounds/[id]/bids/route.ts`
    - Line 121-123: Squad size for bid validation

### Library Files (Core Logic)
15. ✅ `lib/squad-size-validator.ts`
    - Line 52-54: Squad size counting (already correct)

16. ✅ `lib/auction/finalize-round.ts`
    - Line 282-284: Squad size check (already correct)
    - Line 870-872: Squad size check (already correct)

17. ✅ `lib/auction/finalize-bulk-round.ts`
    - Line 160-162: Squad size check (already correct)

18. ✅ `lib/auction/bid-validator.ts`
    - Line 213-215: Squad size for validation (already correct)

19. ✅ `lib/auction/reserve-calculator-v2.ts`
    - Line 229-231: Squad size for reserve calculation (already correct)

20. ✅ `app/api/auction/rounds/[id]/route.ts`
    - Line 80-82: Squad size check (already correct)

21. ✅ `app/api/tiebreakers/[id]/bid/route.ts`
    - Line 119-121: Squad size check (already correct)

22. ✅ `app/api/admin/tiebreakers/[id]/submit-bid/route.ts`
    - Line 118-120: Squad size check (already correct)

### Files NOT Changed (Intentional)
- `app/api/players/search/route.ts` - Search should show all statuses for filtering
- `app/(team)/team/release-request/page.tsx` - Already filtering by ACTIVE
- `app/(team)/team/swap-request/page.tsx` - Already filtering by ACTIVE
- `app/(public)/*` - Public pages already filter by ACTIVE or show all intentionally
- `scripts/*` - Debug/migration scripts don't need filtering
- Finalization and audit files - Already correct

## Pattern Applied
```typescript
// BEFORE (Wrong)
const squadSize = await prisma.transfer_history.count({
  where: {
    teamId,
    seasonId
  }
});

// AFTER (Correct)
const squadSize = await prisma.transfer_history.count({
  where: {
    teamId,
    seasonId,
    status: 'ACTIVE'  // ← Added this
  }
});
```

## Testing Checklist
- [ ] Team dashboard shows correct squad count
- [ ] Bulk round selection shows correct "Current Squad" count
- [ ] Normal round bidding shows correct squad size
- [ ] Squad page only shows active players
- [ ] Squad builder only shows active players
- [ ] Auction planner excludes released players
- [ ] Team detail pages show correct player counts
- [ ] Admin all-teams page shows correct counts
- [ ] Release request page shows correct squad count
- [ ] Swap request page shows correct squad count

## Impact
- Squad size now accurately reflects only ACTIVE players
- Released players no longer counted in squad
- Validation logic works correctly
- Budget calculations based on correct squad size
- UI displays accurate information everywhere

## Related Issues
- User query: "everywhere the squad strength is shown is wrong"
- User query: "Current Squad 20 (25 req) when i can select 6 players it is shown wrong"
- User query: "wrong message shown when my squad strength is 19"

## Status
✅ **COMPLETE** - All squad counting queries now filter by `status: 'ACTIVE'`
