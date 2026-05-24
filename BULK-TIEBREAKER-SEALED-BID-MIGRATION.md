# Bulk Tiebreaker: Migration to Sealed Bid Model

## Overview
Converting bulk tiebreakers from "live auction" model to "sealed bid" model (matching normal tiebreakers).

## Changes Made

### 1. Database Migration ✅
**File**: `scripts/migrations/007-bulk-tiebreaker-sealed-bid.sql`

Added to `bulk_tiebreaker_participants`:
- `new_bid_amount` INT - Sealed bid (hidden from others)
- `submitted` BOOLEAN - Whether bid submitted
- `submitted_at` TIMESTAMPTZ - Submission timestamp

**Run**: `psql -U your_user -d your_db -f scripts/migrations/007-bulk-tiebreaker-sealed-bid.sql`

### 2. Prisma Schema ✅
**File**: `prisma/schema.prisma`

Updated `bulk_tiebreaker_participants` model with new fields.

**Run**: `npx prisma generate` to update Prisma client

### 3. API Changes ✅

#### Team Bid Endpoint
**File**: `app/api/team/bulk-tiebreakers/[id]/bid/route.ts`

**Changes**:
- Accept `newBidAmount` instead of `bidAmount`
- Check if already submitted (can only submit once)
- Store sealed bid in `new_bid_amount` field
- Don't reveal other teams' bids
- Auto-trigger resolution when all submit

#### Resolution Function
**File**: `lib/auction/resolve-bulk-tiebreaker.ts` (NEW)

**Features**:
- Automatically resolves when all teams submit
- Finds highest bid
- Tiebreaker: earliest submission wins
- Creates transfer, updates budget, logs audit

### 4. Still TODO

#### Update GET Endpoint
**File**: `app/api/team/bulk-tiebreakers/[id]/route.ts`

**Needed**:
- Don't return `newBidAmount` for other teams
- Return `submitted` status for all teams
- Return own `newBidAmount` only

#### Create Status Endpoint
**File**: `app/api/team/bulk-tiebreakers/[id]/status/route.ts` (NEW)

**Purpose**:
- Poll for status updates
- Return submission progress
- Notify when resolved

#### Update UI Component
**File**: `components/team-auction/BulkTiebreakerBiddingClient.tsx`

**Changes Needed**:
1. Remove live bidding UI
2. Add sealed bid submission form (like TiebreakerBiddingClient)
3. Show submission status for all teams
4. Hide bid amounts until resolved
5. Remove SSE connection
6. Add polling for status
7. Show "Waiting for others" state
8. Auto-redirect when resolved

#### Update Admin Manual Resolve
**File**: `components/auction/BulkTiebreakerManualResolve.tsx`

**Changes Needed**:
- Show sealed bids (admin can see all)
- Show submission status
- Allow manual resolution even if not all submitted
- Show which teams haven't submitted

#### Update Admin Monitor
**File**: `components/auction/BulkTiebreakerMonitorClient.tsx`

**Changes Needed**:
- Show submission progress
- Don't show live bids
- Show sealed bids after completion

### 5. Withdraw Endpoint
**File**: `app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts`

**Check**: Ensure withdraw still works with new model

## New Workflow

### Team Side
1. Admin starts tiebreaker (status: 'active')
2. Team views tiebreaker page
3. Team enters bid amount (once)
4. Team submits sealed bid
5. UI shows "Submitted - Waiting for others"
6. UI polls for status updates
7. When all submit → auto-resolution
8. UI shows winner and redirects

### Admin Side
1. Create tiebreaker (status: 'pending')
2. Start tiebreaker (status: 'active')
3. Monitor submission progress
4. Option to manually resolve if needed
5. View results after completion

## Key Differences from Live Auction

| Feature | Live Auction (Old) | Sealed Bid (New) |
|---------|-------------------|------------------|
| Bid visibility | All bids visible | Hidden until resolved |
| Bid frequency | Multiple times | Once only |
| Current highest | Shown live | Not shown |
| Bid history | Full history shown | Not shown until end |
| Resolution | Manual or withdraw | Automatic when all submit |
| Withdraw | Anytime | Before submission only |
| Winner determination | Last person standing | Highest sealed bid |

## Testing Checklist

- [ ] Run database migration
- [ ] Generate Prisma client
- [ ] Test bid submission (team side)
- [ ] Test can't submit twice
- [ ] Test auto-resolution when all submit
- [ ] Test manual resolution (admin)
- [ ] Test withdraw before submission
- [ ] Test can't withdraw after submission
- [ ] Test submission status polling
- [ ] Test redirect after resolution
- [ ] Test admin can see sealed bids
- [ ] Test teams can't see others' bids
- [ ] Test tiebreaker (equal bids, earliest wins)

## Migration Steps

1. **Backup database**
2. **Run SQL migration**: `007-bulk-tiebreaker-sealed-bid.sql`
3. **Update Prisma**: `npx prisma generate`
4. **Deploy API changes** (already done)
5. **Update UI components** (TODO)
6. **Test thoroughly**
7. **Deploy to production**

## Rollback Plan

If issues occur:
1. Revert code changes
2. Remove new columns (optional - they won't break anything if unused)
3. Redeploy previous version

## Notes

- Existing `bid_history` table kept for audit trail
- Old `current_bid` field repurposed as base/original bid
- `currentHighestBid` and `currentHighestTeamId` still used for final result
- Compatible with existing manual resolution
