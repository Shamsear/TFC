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

### 4. API Endpoints ✅

#### GET Endpoint (Updated)
**File**: `app/api/team/bulk-tiebreakers/[id]/route.ts`

**Changes**:
- Returns `newBidAmount`, `submitted`, `submittedAt` for participants
- Hides other teams' bid amounts (sealed)
- Returns own `newBidAmount` only
- Removed `bidHistory` from response

#### Status Polling Endpoint (NEW)
**File**: `app/api/team/bulk-tiebreakers/[id]/status/route.ts`

**Features**:
- Returns tiebreaker status
- Returns submission progress (count)
- Returns participant submission status
- Hides bid amounts until completed

#### Withdraw Endpoint (Updated)
**File**: `app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts`

**Changes**:
- Checks if team has submitted
- Prevents withdrawal after submission
- Returns updated sealed bid structure

### 5. Team UI ✅

#### Bidding Client (Completely Rewritten)
**File**: `components/team-auction/BulkTiebreakerBiddingClient.tsx`

**Changes**:
- Removed all live bidding UI (SSE, bid history, multiple bids)
- Added sealed bid submission form (single input, submit once)
- Added "Tied Teams" list with submission status
- Added submission progress counter
- Added polling for status updates (3 second interval)
- Added "Waiting for others" state after submission
- Added auto-redirect to dashboard when resolved
- Removed withdraw functionality after submission
- Matches TiebreakerBiddingClient pattern

### 6. Admin UI ✅

#### Manual Resolve Component (Updated)
**File**: `components/auction/BulkTiebreakerManualResolve.tsx`

**Changes**:
- Shows sealed bids (admin can see all `newBidAmount` values)
- Shows submission status for each team
- Allows manual resolution even if not all submitted
- Indicates which teams haven't submitted yet
- Updated interface to use `newBidAmount` and `submitted` fields

#### Monitor Client (Updated)
**File**: `components/auction/BulkTiebreakerMonitorClient.tsx`

**Changes**:
- Shows submission progress counter
- Displays sealed bids table (admin view)
- Hides bid amounts during active state
- Shows sealed bids after completion
- Updated stats to show submissions instead of current highest
- Removed bid history display (not used in sealed bid model)

### 7. Testing & Verification (TODO)

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

- [x] Run database migration
- [x] Generate Prisma client
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

## Migration Status

### ✅ COMPLETED
1. Database migration created and run
2. Prisma schema updated and generated
3. Bid API endpoint updated for sealed bids
4. Auto-resolution function created
5. GET endpoint updated to hide sealed bids
6. Status polling endpoint created
7. Withdraw endpoint updated with submission check
8. Team bidding UI completely rewritten
9. Admin manual resolve component updated
10. Admin monitor component updated
11. Finalization utilities updated for sealed bid model

### 🎯 READY FOR TESTING
All code changes are complete. The sealed bid model is now fully implemented and ready for testing.

## Files Updated

### Backend
- `app/api/team/bulk-tiebreakers/[id]/bid/route.ts` - Sealed bid submission
- `app/api/team/bulk-tiebreakers/[id]/route.ts` - Hide sealed bids from other teams
- `app/api/team/bulk-tiebreakers/[id]/status/route.ts` - Status polling (NEW)
- `app/api/team/bulk-tiebreakers/[id]/withdraw/route.ts` - Prevent withdrawal after submission
- `lib/auction/resolve-bulk-tiebreaker.ts` - Auto-resolution when all submit (NEW)
- `lib/auction/finalize-bulk-tiebreaker.ts` - Updated for sealed bid model

### Frontend
- `components/team-auction/BulkTiebreakerBiddingClient.tsx` - Complete rewrite for sealed bids
- `components/auction/BulkTiebreakerManualResolve.tsx` - Show sealed bids to admin
- `components/auction/BulkTiebreakerMonitorClient.tsx` - Submission progress display

### Database
- `scripts/migrations/007-bulk-tiebreaker-sealed-bid.sql` - Schema migration
- `prisma/schema.prisma` - Updated model

## Migration Steps

1. **✅ Backup database**
2. **✅ Run SQL migration**: `007-bulk-tiebreaker-sealed-bid.sql`
3. **✅ Update Prisma**: `npx prisma generate`
4. **✅ Deploy API changes** (completed)
5. **✅ Update UI components** (completed)
6. **🎯 Test thoroughly** (next step)
7. **⏳ Deploy to production** (after testing)

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
