# Bulk Tiebreaker System - Complete Analysis

## Overview
The bulk tiebreaker system resolves conflicts when multiple teams select the same player in a bulk round. It's a "last person standing" auction where teams bid until only one remains.

## Database Schema

### Tables
1. **bulk_tiebreakers** - Main tiebreaker records
   - `id` (SERIAL PRIMARY KEY)
   - `round_id` (VARCHAR(20)) - Links to rounds table
   - `base_player_id` (VARCHAR(20)) - Player being auctioned
   - `base_price` (INT) - Starting price from bulk round
   - `status` (VARCHAR(20)) - **LOWERCASE**: 'pending', 'active', 'completed', 'cancelled'
   - `current_highest_bid` (INT) - Current highest bid amount
   - `current_highest_team_id` (VARCHAR(20)) - Team with highest bid
   - `teams_remaining` (INT) - Number of teams still active
   - `start_time` (TIMESTAMPTZ) - When tiebreaker started
   - `max_end_time` (TIMESTAMPTZ) - 24-hour safety limit
   - `created_at` (TIMESTAMPTZ) - Creation timestamp

2. **bulk_tiebreaker_participants** - Teams in tiebreaker
   - `id` (SERIAL PRIMARY KEY)
   - `tiebreaker_id` (INT) - Links to bulk_tiebreakers
   - `team_id` (VARCHAR(20)) - Team participating
   - `status` (VARCHAR(20)) - 'active', 'withdrawn', 'eliminated'
   - `current_bid` (INT) - Team's current bid
   - `last_bid_time` (TIMESTAMPTZ) - When they last bid

3. **bulk_tiebreaker_bid_history** - Complete bid history
   - `id` (SERIAL PRIMARY KEY)
   - `tiebreaker_id` (INT)
   - `team_id` (VARCHAR(20))
   - `bid_amount` (INT)
   - `bid_time` (TIMESTAMPTZ)

## Status Values (CRITICAL)
**All status values MUST be lowercase** due to database CHECK constraint:
- ✅ 'pending' - Tiebreaker created, not started
- ✅ 'active' - Bidding in progress
- ✅ 'completed' - Winner determined or marked unsold
- ✅ 'cancelled' - Tiebreaker cancelled
- ❌ 'COMPLETED', 'PENDING', etc. - **WILL FAIL** with constraint violation

## API Endpoints

### Admin Endpoints
1. **POST /api/admin/bulk-tiebreakers** - Create tiebreaker
2. **GET /api/admin/bulk-tiebreakers** - List all tiebreakers
3. **GET /api/admin/bulk-tiebreakers/[id]** - Get tiebreaker details
4. **POST /api/admin/bulk-tiebreakers/[id]/start** - Start/activate tiebreaker
5. **POST /api/admin/bulk-tiebreakers/[id]/resolve** - Manual resolution with bids
6. **POST /api/admin/bulk-tiebreakers/[id]/mark-unsold** - Mark as unsold (no winner)

### Team Endpoints
1. **GET /api/team/bulk-tiebreakers/[id]** - Get tiebreaker info
2. **POST /api/team/bulk-tiebreakers/[id]/bid** - Place bid
3. **POST /api/team/bulk-tiebreakers/[id]/withdraw** - Withdraw from tiebreaker
4. **GET /api/team/bulk-tiebreakers/[id]/stream** - SSE stream (DEPRECATED - removed)

## Workflow

### 1. Creation (Automatic)
- Created when bulk round finalization detects multiple teams selected same player
- Status: 'pending'
- All conflicting teams added as participants

### 2. Activation
- Admin starts tiebreaker via `/start` endpoint
- Status changes: 'pending' → 'active'
- Sets `start_time` and `max_end_time` (24 hours)
- Teams can now bid

### 3. Bidding (Automatic)
- Teams place bids via `/bid` endpoint
- Each bid must be higher than current highest
- Updates `current_highest_bid` and `current_highest_team_id`
- Records in bid history
- Teams can withdraw at any time

### 4. Resolution (Two Methods)

#### Method A: Manual Resolution (Admin)
**Endpoint**: POST `/api/admin/bulk-tiebreakers/[id]/resolve`

**Process**:
1. Admin enters final bids for each team
2. System validates bids ≥ base price
3. Winner auto-selected (highest bid)
4. Transaction creates:
   - Updates all participant bids
   - Adds bids to history
   - Updates tiebreaker status to 'completed'
   - Creates `transfer_history` record (status: 'ACTIVE')
   - Deducts from team budget (`season_teams.currentBudget`)
   - Creates `financial_ledger` entry (type: 'PLAYER_PURCHASE')
   - Creates audit log (action: 'BULK_TIEBREAKER_MANUAL_RESOLVE')

**Files**:
- API: `app/api/admin/bulk-tiebreakers/[id]/resolve/route.ts`
- Component: `components/auction/BulkTiebreakerManualResolve.tsx`

#### Method B: Mark as Unsold (Admin)
**Endpoint**: POST `/api/admin/bulk-tiebreakers/[id]/mark-unsold`

**Process**:
1. Admin clicks "Mark as Unsold"
2. Transaction:
   - Updates status to 'completed'
   - Sets `current_highest_team_id` = null
   - Sets `current_highest_bid` = null
   - Creates audit log (action: 'BULK_TIEBREAKER_MARK_UNSOLD')
3. **NO transfer record created**
4. **NO financial transactions**
5. Player remains available

**Files**:
- API: `app/api/admin/bulk-tiebreakers/[id]/mark-unsold/route.ts`
- Component: `components/auction/BulkTiebreakerManualResolve.tsx` (button + modal)

## UI Components

### Admin Views
1. **Bulk Tiebreakers List** - `app/(admin)/sub-admin/[seasonId]/auction/bulk-tiebreakers/page.tsx`
   - Shows all tiebreakers grouped by status (Active, Pending, Completed)
   - Links to individual tiebreaker pages

2. **Tiebreaker Monitor** - `app/(admin)/sub-admin/[seasonId]/auction/bulk-tiebreakers/[id]/page.tsx`
   - Shows player info, participants, bid history
   - Manual resolve component
   - Mark unsold button
   - Refresh button (no SSE)

3. **Manual Resolve Component** - `components/auction/BulkTiebreakerManualResolve.tsx`
   - Bid input fields for each team
   - Shows team budget and squad slots
   - Auto-selects winner (highest bid)
   - Validates budget and slots
   - "Resolve Tiebreaker" button
   - "Mark as Unsold" button

### Team Views
1. **Tiebreaker Bidding** - `components/team-auction/BulkTiebreakerBiddingClient.tsx`
   - Real-time bidding interface
   - Shows current highest bid
   - Bid input and submit
   - Withdraw button
   - Live updates via polling (SSE removed)

## Key Features

### Budget & Squad Validation
- Shows current budget and squad size for each team
- Calculates "After Purchase" balance
- Validates minimum £10 per remaining squad slot
- Color-coded warnings:
  - Red: Insufficient funds or full squad
  - Amber: Low budget or few slots remaining
  - White: Sufficient resources

### Auto-Selection
- Winner automatically selected based on highest bid
- Updates in real-time as bids change
- Shows winner badge on selected team

### Audit Trail
- All actions logged in `audit_logs` table
- Includes: user, action type, entity details
- Actions tracked:
  - BULK_TIEBREAKER_MANUAL_RESOLVE
  - BULK_TIEBREAKER_MARK_UNSOLD

## Common Issues & Fixes

### Issue 1: Status Case Sensitivity
**Problem**: Using 'COMPLETED' instead of 'completed'
**Error**: `violates check constraint "bulk_tiebreakers_status_check"`
**Fix**: Always use lowercase status values

### Issue 2: Missing Fields
**Problem**: Trying to update non-existent fields like `completedAt`, `winnerId`
**Error**: `Unknown argument`
**Fix**: Use correct field names from schema:
- ✅ `currentHighestTeamId` (not `winnerId`)
- ✅ `currentHighestBid` (not `winningBid`)
- ✅ No `completedAt` field exists

### Issue 3: SSE Errors
**Problem**: Stream route files causing "Controller is already closed" errors
**Fix**: Delete stream folders:
- `app/api/admin/bulk-tiebreakers/[id]/stream/`
- `app/api/team/bulk-tiebreakers/[id]/stream/`

## Files to Update for Changes

### Status-Related Changes
All files checking `status === 'completed'`:
- `lib/auction/finalize-round.ts`
- `lib/auction/tiebreaker.ts`
- `lib/auction/lazy-finalize-round.ts`
- `lib/auction/finalize-bulk-round.ts`
- `components/auction/BulkTiebreakerMonitorClient.tsx`
- `components/auction/RoundDetailClient.tsx`
- `app/api/admin/bulk-tiebreakers/[id]/resolve/route.ts`
- `app/api/admin/bulk-tiebreakers/[id]/mark-unsold/route.ts`

### Resolution Logic Changes
- `app/api/admin/bulk-tiebreakers/[id]/resolve/route.ts` - Main resolution logic
- `components/auction/BulkTiebreakerManualResolve.tsx` - UI for manual resolution

### Display Changes
- `components/auction/BulkTiebreakerMonitorClient.tsx` - Admin monitor view
- `components/team-auction/BulkTiebreakerBiddingClient.tsx` - Team bidding view
- `app/(admin)/sub-admin/[seasonId]/auction/bulk-tiebreakers/page.tsx` - List view

## Recommendations

### Current System Works Well For:
✅ Manual resolution with admin oversight
✅ Budget and squad validation
✅ Audit trail
✅ Unsold player handling

### Potential Improvements:
1. **Add completion timestamp field** to track when tiebreaker was resolved
2. **Add winner tracking** separate from current highest bid (for historical data)
3. **Automatic resolution** when only one team remains
4. **Time-based auto-completion** when max_end_time reached
5. **Notification system** for teams when tiebreaker starts/ends
6. **Bid increment rules** (minimum bid increase)

## Testing Checklist

When making changes, test:
- [ ] Create tiebreaker (status = 'pending')
- [ ] Start tiebreaker (status = 'active')
- [ ] Manual resolve with winner
  - [ ] Transfer record created
  - [ ] Budget deducted
  - [ ] Financial ledger entry
  - [ ] Audit log created
  - [ ] Status = 'completed'
- [ ] Mark as unsold
  - [ ] No transfer record
  - [ ] No budget changes
  - [ ] Status = 'completed'
  - [ ] Audit log created
- [ ] Budget validation warnings
- [ ] Squad slot validation
- [ ] Winner auto-selection
- [ ] All status values lowercase


---

## Team-Side Bulk Tiebreaker Analysis

### Current Implementation

**Component**: `components/team-auction/BulkTiebreakerBiddingClient.tsx`

**Features**:
- Real-time bidding interface
- SSE stream for live updates (with 500ms polling fallback)
- Optimistic UI updates
- Bid confirmation modal when already winning
- Withdraw functionality
- Budget reserve information
- Quick bid buttons (+£1, +£5, +£10, +£100)
- Bid history display
- Participants list with status

### Issues Found

#### 1. **SSE Stream Still Referenced**
**Problem**: Component still tries to connect to SSE stream endpoint
```typescript
eventSource = new EventSource(
  `/api/team/bulk-tiebreakers/${tiebreaker.id}/stream?t=${Date.now()}`,
  { withCredentials: true }
)
```

**Impact**: 
- Errors in console: "Keep-alive ping error: Controller is already closed"
- Unnecessary network requests
- Fallback polling works but SSE connection fails

**Fix Needed**: Remove SSE connection code, rely only on polling

#### 2. **Status Case Sensitivity**
**Current**: Component checks `liveData.status === 'completed'` (lowercase) ✅
**Database**: Uses lowercase status values ✅
**Status**: This is correct!

#### 3. **Unused Variables**
- `myParticipation` prop - not used (gets from liveData instead)
- `router` - imported but never used
- `isPolling` - set but never checked
- `bidLockSeconds` - calculated but never displayed

### API Endpoints (Team)

#### GET `/api/team/bulk-tiebreakers/[id]`
- Returns tiebreaker details
- Includes participants, bid history
- Used for polling updates

#### POST `/api/team/bulk-tiebreakers/[id]/bid`
- Places a bid
- Validates bid amount
- Returns updated tiebreaker state
- Uses `placeBulkTiebreakerBid` utility function

#### POST `/api/team/bulk-tiebreakers/[id]/withdraw`
- Withdraws team from tiebreaker
- Cannot withdraw if currently winning
- Updates participant status to 'withdrawn'

#### GET `/api/team/bulk-tiebreakers/[id]/stream` ❌
- **DEPRECATED** - Should be removed
- Causes errors when accessed
- Folder deleted but may still be cached

### Workflow (Team Side)

1. **View Tiebreaker**
   - Team sees tiebreaker in auction dashboard
   - Clicks to view details
   - Component loads with initial data

2. **Live Updates**
   - SSE connection attempts (fails)
   - 500ms polling fallback works
   - Visibility change handler re-syncs on tab focus
   - Manual refresh button available

3. **Place Bid**
   - Enter bid amount or use quick add buttons
   - If already winning → confirmation modal
   - If not winning → bid directly
   - Optimistic UI update (instant)
   - API call to place bid
   - On success: show success message
   - On error: rollback optimistic update

4. **Withdraw**
   - Click withdraw button
   - Cannot withdraw if winning
   - Confirmation dialog
   - Optimistic UI update
   - API call to withdraw
   - Status changes to 'withdrawn'

### Budget Reserve System

**Purpose**: Prevents teams from bidding all their money and being unable to fill remaining slots

**Phases**:
1. **Phase 1 (Strict)**: Early rounds, strict reserve requirements
2. **Phase 2 (Soft)**: Mid rounds, recommended limits with warnings
3. **Phase 3 (Flexible)**: Late rounds, minimal restrictions

**Display**:
- Shows required reserve amount
- Shows maximum allowed bid
- Color-coded by phase (red/amber/blue)
- Breakdown of reserve calculation

### Recommendations for Team Side

#### High Priority
1. **Remove SSE Connection Code**
   - Delete SSE connection logic
   - Keep only 500ms polling
   - Remove visibility change SSE reconnection
   - Keep visibility change data sync

2. **Clean Up Unused Code**
   - Remove unused `myParticipation` prop
   - Remove unused `router` import
   - Remove or use `isPolling` state
   - Display `bidLockSeconds` or remove calculation

3. **Improve Error Handling**
   - Better error messages for common failures
   - Network error recovery
   - Timeout handling

#### Medium Priority
4. **Add Bid Validation Feedback**
   - Show why bid is invalid before submission
   - Real-time validation as user types
   - Clear indication of min/max bid

5. **Improve Mobile Experience**
   - Better responsive design for bid inputs
   - Touch-friendly quick bid buttons
   - Simplified layout on small screens

6. **Add Notifications**
   - Browser notification when outbid
   - Sound alert option
   - Visual flash when new bid placed

#### Low Priority
7. **Add Bid Strategy Helper**
   - Suggest optimal bid amounts
   - Show probability of winning
   - Historical bid patterns

8. **Add Auto-Bid Feature**
   - Set maximum bid
   - Auto-increment when outbid
   - Stop at maximum

### Testing Checklist (Team Side)

- [ ] View tiebreaker details
- [ ] Place bid (not winning)
  - [ ] Optimistic update works
  - [ ] Success message shows
  - [ ] Bid appears in history
- [ ] Place bid (already winning)
  - [ ] Confirmation modal appears
  - [ ] Can cancel
  - [ ] Can confirm
- [ ] Withdraw from tiebreaker
  - [ ] Cannot withdraw when winning
  - [ ] Confirmation dialog
  - [ ] Status updates to withdrawn
- [ ] Budget reserve warnings
  - [ ] Shows correct phase
  - [ ] Prevents over-bidding
  - [ ] Displays breakdown
- [ ] Live updates
  - [ ] Polling works (500ms)
  - [ ] Manual refresh works
  - [ ] Tab visibility sync works
- [ ] Bid history
  - [ ] Shows all bids
  - [ ] Sorted by time (newest first)
  - [ ] Shows team names
- [ ] Participants list
  - [ ] Shows all teams
  - [ ] Indicates leader
  - [ ] Shows withdrawn teams
- [ ] Completed state
  - [ ] Shows winner
  - [ ] Disables bidding
  - [ ] Shows final bid amount

### Code to Remove (SSE)

```typescript
// DELETE THIS ENTIRE SECTION
useEffect(() => {
  if (liveData.status === 'completed') return

  let eventSource: EventSource | null = null

  const connectStream = () => {
    // ... SSE connection code ...
  }

  connectStream()
  
  // ... SSE error handling ...
  
  return () => {
    if (eventSource) {
      eventSource.close()
    }
  }
}, [tiebreaker.id, liveData.status, syncTrigger])
```

**Keep**: 500ms polling interval and visibility change handler (without SSE reconnection)

### Files to Update

1. **Remove SSE**:
   - `components/team-auction/BulkTiebreakerBiddingClient.tsx`
   - Delete SSE connection logic
   - Keep polling fallback

2. **Clean Up**:
   - Remove unused props and variables
   - Simplify state management

3. **Improve UX**:
   - Better error messages
   - Loading states
   - Success feedback
