# Balance Audit Refund Display Fix

## Problem
The balance audit page was not displaying refund amounts from released players, even though the API was calculating them correctly. This made it difficult to understand why team balances were what they were.

## Root Cause
- The API (`app/api/admin/balances/audit/route.ts`) was calculating `totalRefunds` from the financial ledger
- However, the UI component (`components/admin/BalanceAuditClient.tsx`) was not displaying this information
- The `TeamAudit` interface was missing the `totalRefunds` field
- The display grid only showed: Starting Purse, Total Spent, Total Sales, Current, Expected

## Solution
Added refund display to the balance audit UI to show all financial transactions.

## Changes Made

### 1. Updated TypeScript Interface
**File**: `components/admin/BalanceAuditClient.tsx`

Added `totalRefunds` field to the `TeamAudit` interface:
```typescript
interface TeamAudit {
  teamId: string
  teamName: string
  currentBalance: number
  initialPurse: number
  totalSpent: number
  totalSales: number
  totalRefunds: number  // ← Added this
  totalAdjustments: number
  calculatedBalance: number
  difference: number
  hasError: boolean
  transferCount: number
  ledgerEntryCount: number
}
```

### 2. Updated Error Display Grid
**File**: `components/admin/BalanceAuditClient.tsx`

Changed from 5-column to 6-column grid to include refunds:

**Before**:
```
Starting Purse | Total Spent | Total Sales | Current | Expected
```

**After**:
```
Starting Purse | Total Spent | Total Sales | Total Refunds | Current | Expected
```

Display code:
```typescript
<div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
  <div>
    <div className="text-gray-500 mb-1">Starting Purse</div>
    <div className="font-bold text-blue-400">£{team.initialPurse.toLocaleString()}</div>
  </div>
  <div>
    <div className="text-gray-500 mb-1">Total Spent</div>
    <div className="font-bold text-red-400">-£{team.totalSpent.toLocaleString()}</div>
  </div>
  <div>
    <div className="text-gray-500 mb-1">Total Sales</div>
    <div className="font-bold text-emerald-400">+£{team.totalSales.toLocaleString()}</div>
  </div>
  <div>
    <div className="text-gray-500 mb-1">Total Refunds</div>
    <div className="font-bold text-cyan-400">+£{team.totalRefunds.toLocaleString()}</div>
  </div>
  <div>
    <div className="text-gray-500 mb-1">Current</div>
    <div className="font-bold text-white">£{team.currentBalance.toLocaleString()}</div>
  </div>
  <div>
    <div className="text-gray-500 mb-1">Expected</div>
    <div className="font-bold text-emerald-400">£{team.calculatedBalance.toLocaleString()}</div>
  </div>
</div>
```

### 3. Updated Correct Teams Display
**File**: `components/admin/BalanceAuditClient.tsx`

Added refunds to the summary text for teams with correct balances:
```typescript
<div className="text-xs text-gray-500 mt-1">
  {team.transferCount} transfers • £{team.totalSpent.toLocaleString()} spent
  {team.totalSales > 0 && ` • £${team.totalSales.toLocaleString()} sales`}
  {team.totalRefunds > 0 && ` • £${team.totalRefunds.toLocaleString()} refunds`}
</div>
```

## API Calculation (Already Correct)
**File**: `app/api/admin/balances/audit/route.ts`

The API was already calculating refunds correctly:
```typescript
const totalRefunds = ledgerEntries
  .filter(e => e.transactionType === 'REFUND')
  .reduce((sum, e) => sum + e.amount, 0);
```

## Display Colors
- **Starting Purse**: Blue (`text-blue-400`)
- **Total Spent**: Red (`text-red-400`) with minus sign
- **Total Sales**: Green (`text-emerald-400`) with plus sign
- **Total Refunds**: Cyan (`text-cyan-400`) with plus sign
- **Current Balance**: White (`text-white`)
- **Expected Balance**: Green (`text-emerald-400`)

## Example Display

### Team with Error
```
Starting Purse: £10,000
Total Spent: -£8,500
Total Sales: +£500
Total Refunds: +£1,200
Current: £3,100
Expected: £3,200
```

### Team without Error
```
Team Name
Balance: £3,200
15 transfers • £8,500 spent • £500 sales • £1,200 refunds
```

## Benefits
1. ✅ Shows complete financial picture for each team
2. ✅ Makes it clear where refunds came from (released players)
3. ✅ Helps identify balance discrepancies more easily
4. ✅ Provides transparency in financial calculations
5. ✅ Matches the ledger transaction types

## Related Files
- `app/api/admin/balances/audit/route.ts` - API endpoint (already correct)
- `components/admin/BalanceAuditClient.tsx` - UI component (updated)
- `app/(admin)/sub-admin/[seasonId]/tools/balance-audit/page.tsx` - Page wrapper

## Testing
- [x] No TypeScript errors
- [x] Interface updated with totalRefunds field
- [x] Display grid shows 6 columns
- [x] Refunds shown in cyan color
- [ ] Visual verification on balance audit page
- [ ] Test with teams that have refunds
- [ ] Test with teams that don't have refunds

## Status
✅ **COMPLETE** - Refunds now displayed in balance audit UI
