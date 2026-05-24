# Bulk Tiebreaker Manual Resolution

## Overview
Added functionality to manually resolve bulk tiebreakers by allowing admins to input final bids for each team and select a winner.

## Features

### 1. Manual Resolution UI
- **Location**: Admin bulk tiebreaker monitor page (`/sub-admin/[seasonId]/auction/bulk-tiebreakers/[id]`)
- **Access**: Click "Manual Resolve" button in the header
- **Functionality**:
  - Input final bid amounts for each participating team
  - Select the winning team
  - View summary before confirming
  - Confirmation modal with final details

### 2. API Endpoint
- **Route**: `POST /api/admin/bulk-tiebreakers/[id]/resolve`
- **Payload**:
  ```json
  {
    "teamBids": {
      "TEAM-1": 50000,
      "TEAM-2": 48000,
      "TEAM-3": 45000
    },
    "winnerId": "TEAM-1"
  }
  ```
- **Validations**:
  - All bids must be at least the base price
  - Winner must be a participant
  - Winning bid must be at least the base price
  - Tiebreaker must not already be completed

### 3. Resolution Process
When a tiebreaker is manually resolved:
1. Updates all participant bids with the provided amounts
2. Adds entries to bid history
3. Marks tiebreaker as completed
4. Creates transfer record for the player
5. Creates financial transaction (deducts winning bid from team balance)
6. Updates team balance
7. Allocates player to winning team
8. Creates audit log entry

## Usage

### Step 1: Navigate to Tiebreaker
1. Go to auction page: `/sub-admin/[seasonId]/auction`
2. Click on a bulk tiebreaker from the list
3. Or navigate directly to: `/sub-admin/[seasonId]/auction/bulk-tiebreakers/[id]`

### Step 2: Open Manual Resolution
1. Click the "Manual Resolve" button in the header (green button with checkmark icon)
2. The manual resolution form will appear above the bid history

### Step 3: Enter Bids
1. For each participating team, enter their final bid amount
2. Bids must be at least the base price
3. Use the number input or type directly

### Step 4: Select Winner
1. Click "Select Winner" button next to the winning team
2. The selected team will be highlighted in green
3. A summary will appear showing the winner and winning bid

### Step 5: Confirm Resolution
1. Click "Resolve Tiebreaker" button
2. Review the confirmation modal
3. Click "Confirm" to finalize
4. You'll be redirected to the auction page upon success

## Technical Details

### Files Created
- `app/api/admin/bulk-tiebreakers/[id]/resolve/route.ts` - API endpoint
- `components/auction/BulkTiebreakerManualResolve.tsx` - UI component

### Files Modified
- `components/auction/BulkTiebreakerMonitorClient.tsx` - Added manual resolve button and integration

### Database Operations
The resolution is performed in a transaction to ensure atomicity:
- `bulk_tiebreaker_participants` - Updated with final bids
- `bulk_tiebreaker_bid_history` - New entries added
- `bulk_tiebreakers` - Status updated to completed
- `transfers` - New transfer record created
- `financial_ledger` - Transaction recorded
- `teams` - Balance updated
- `players` - Allocated to winning team
- `audit_logs` - Action logged

### Security
- Requires SUPER_ADMIN or SUB_ADMIN role
- All operations in transaction (rollback on failure)
- Audit log created for accountability
- Validates all inputs before processing

## Use Cases

### When to Use Manual Resolution
- Tiebreaker has been running too long
- Teams are not actively bidding
- Need to resolve quickly for scheduling reasons
- Technical issues preventing normal resolution
- Offline auction results need to be recorded

### When NOT to Use
- Tiebreaker is actively progressing normally
- Only one team remains (will auto-finalize)
- Time has expired (will auto-finalize)

## Notes
- Manual resolution cannot be undone
- All financial transactions are permanent
- Player allocation is immediate
- Teams must have sufficient balance for their bids (validation happens at transaction time)
- The action is logged in audit logs for tracking
