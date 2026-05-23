# Bid Edit Validation Fix

## Problem

When two rounds were running in parallel:
1. Team submits bids for both Round A and Round B
2. Round A finalizes first, reducing the team's balance
3. Team tries to edit their bids in Round B (still ongoing)
4. **Validation fails** because the reserve calculation uses the reduced balance from Round A's finalization

The team couldn't edit their already-submitted bids even though the round was still active.

## Root Cause

The bid validation was checking balance and reserve requirements for **all** bid submissions, including edits. This caused issues when:
- Multiple rounds run in parallel
- One round finalizes while another is still active
- Team's balance changes between initial submission and edit attempt

## Solution

**Skip balance and reserve validation for bid edits**, only validate for new submissions.

### Why This Works

1. **Bids were already valid when first submitted** - they passed all validations at submission time
2. **Balance may have changed** due to other rounds finalizing in parallel
3. **Teams should be able to edit their existing bids** without being blocked by balance changes
4. **Final validation happens at finalization** - the system will properly check reserves when the round actually finalizes

### What Still Gets Validated During Edits

Even when editing, the system still validates:
- ✅ Bid structure (correct format)
- ✅ Bid count (within round limits)
- ✅ Bid amounts (above base price)
- ✅ No duplicate players
- ✅ No duplicate amounts
- ✅ Players exist in season
- ✅ Players are not already owned

### What Gets Skipped During Edits

- ❌ Budget validation (amount doesn't exceed current balance)
- ❌ Reserve validation (amount doesn't violate reserve requirements)

These checks are skipped because the balance may have changed since the original submission due to parallel rounds.

## Implementation

### Changes Made

1. **app/api/auction/rounds/[id]/bids/route.ts**
   - Check if bids already exist (edit vs new submission)
   - Pass `skipBalanceCheck: true` flag for edits

2. **lib/auction/bid-validator.ts**
   - Added `skipBalanceCheck` flag to `ValidationContext`
   - Modified `validateBids()` to skip budget and reserve validation when flag is set
   - Still validates all other constraints (structure, duplicates, existence, availability)

## Testing

To test the fix:
1. Start two rounds in parallel (Round A and Round B)
2. Submit bids for both rounds as a team
3. Finalize Round A (team's balance decreases)
4. Try to edit bids in Round B
5. **Expected**: Edit should succeed without balance validation errors
6. **Actual**: Edit succeeds, bids are updated

## Safety

This change is safe because:
- Final validation happens at round finalization
- The finalization process checks actual balance and reserves
- Teams can't exploit this to overbid - finalization will catch it
- Only affects editing existing bids, not new submissions
- All other validations (duplicates, availability, etc.) still apply

## Related Files

- `app/api/auction/rounds/[id]/bids/route.ts` - Bid submission endpoint
- `lib/auction/bid-validator.ts` - Validation logic
- `lib/auction/finalize-round.ts` - Final validation at finalization
- `lib/auction/reserve-calculator-v2.ts` - Reserve calculation logic
