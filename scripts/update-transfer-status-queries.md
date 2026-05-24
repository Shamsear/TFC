# Transfer Status Migration - Query Updates

## Overview
After adding the `status` column to `transfer_history`, all queries that count squad size or check player ownership must filter by `status = 'ACTIVE'`.

## Files Updated ✅

### Core Libraries
- ✅ `lib/auction/reserve-calculator-v2.ts` - Squad size count (line ~230)
- ✅ `lib/squad-size-validator.ts` - Squad size count (line ~53)
- ✅ `lib/auction/bid-validator.ts` - Squad size count (line ~214) and ownership check (line ~328)
- ✅ `lib/auction/finalize-round.ts` - Squad size counts (lines ~283, ~870)

### API Routes - Release & Transfer
- ✅ `app/api/admin/players/release/route.ts` - Updated to mark as RELEASED
- ✅ `app/api/admin/teams/players/route.ts` - Filter by ACTIVE status
- ✅ `app/api/admin/players/transfer/route.ts` - Mark as TRANSFERRED_OUT

### Prisma Schema
- ✅ `prisma/schema.prisma` - Added status, releasedAt, releaseNotes columns and TransferStatus enum

## Files That Need Updates 🔄

### Finalization Libraries
- `lib/auction/finalize-bulk-tiebreaker.ts` - Line ~663 (squad size count)
- `lib/auction/finalize-bulk-round.ts` - Lines ~135 (ownership check), ~160 (squad size count)

### API Routes - Bidding
- `app/api/tiebreakers/[id]/bid/route.ts` - Line ~120 (squad size count)
- `app/api/team/bulk-rounds/[id]/select/route.ts` - Line ~104 (squad size count)
- `app/api/auction/rounds/[id]/route.ts` - Line ~81 (squad size count)
- `app/api/admin/tiebreakers/[id]/submit-bid/route.ts` - Line ~119 (squad size count)

### API Routes - Player Management
- `app/api/seasons/[seasonId]/retention/route.ts` - Lines ~146, ~216 (ownership checks)
- `app/api/seasons/[seasonId]/players/route.ts` - Line ~18 (transferred players)
- `app/api/players/search/route.ts` - Lines ~264, ~265 (transfer search)
- `app/api/seasons/[seasonId]/auction/route.ts` - Line ~116 (ownership check)
- `app/api/seasons/[seasonId]/auction/sold/route.ts` - Line ~14 (sold players)
- `app/api/seasons/[seasonId]/auction/sell/route.ts` - Line ~30 (ownership check)

### API Routes - Admin Tools
- `app/api/admin/transfers/fix/route.ts` - Lines ~53, ~65 (ownership checks)
- `app/api/admin/teams/all-bids/route.ts` - Lines ~47, ~69 (ownership checks)
- `app/api/admin/players/replace-allocation/route.ts` - Lines ~36, ~62 (ownership checks)
- `app/api/admin/rounds/[id]/team-bids-with-status/route.ts` - Line ~48 (ownership check)

### Scripts (Lower Priority - for debugging/maintenance)
- `scripts/debug-reserve-calculation.ts`
- `scripts/audit-team-balances.ts`
- Various other migration/fix scripts

## Query Patterns

### Squad Size Count (ACTIVE only)
```typescript
// BEFORE
const squadSize = await prisma.transfer_history.count({
  where: { teamId, seasonId }
});

// AFTER
const squadSize = await prisma.transfer_history.count({
  where: { 
    teamId, 
    seasonId,
    status: 'ACTIVE'
  }
});
```

### Ownership Check (ACTIVE only)
```typescript
// BEFORE
const existingTransfer = await prisma.transfer_history.findFirst({
  where: {
    basePlayerId: playerId,
    seasonId: seasonId
  }
});

// AFTER
const existingTransfer = await prisma.transfer_history.findFirst({
  where: {
    basePlayerId: playerId,
    seasonId: seasonId,
    status: 'ACTIVE'
  }
});
```

### Get Team Players (ACTIVE only)
```typescript
// BEFORE
const transfers = await prisma.transfer_history.findMany({
  where: {
    seasonId,
    teamId
  }
});

// AFTER
const transfers = await prisma.transfer_history.findMany({
  where: {
    seasonId,
    teamId,
    status: 'ACTIVE'
  }
});
```

### Historical Queries (ALL statuses)
Some queries should NOT filter by status:
- Audit logs and historical reports
- Transfer history displays showing all past transfers
- Debugging scripts that need to see released/transferred players

## Migration Steps

1. ✅ Run SQL migration: `scripts/add-transfer-status-column.sql`
2. ✅ Update Prisma schema
3. ✅ Run `npx prisma generate`
4. 🔄 Update all query files (in progress)
5. ⏳ Test release functionality
6. ⏳ Test transfer functionality
7. ⏳ Test squad size calculations
8. ⏳ Test bidding with reserve calculations

## Testing Checklist

- [ ] Release player - verify status changes to RELEASED
- [ ] Transfer player - verify old transfer marked TRANSFERRED_OUT, new transfer created as ACTIVE
- [ ] Squad size shows only ACTIVE players
- [ ] Reserve calculations use only ACTIVE players
- [ ] Bidding validates against ACTIVE squad size
- [ ] Team player list shows only ACTIVE players
- [ ] Historical views can still see released/transferred players if needed
