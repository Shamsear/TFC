# Fix Stuck Finalization - Complete Guide

## Problem
A round is stuck in "finalizing" status after tiebreakers were completed. The round cannot progress to "completed" status.

## Root Cause
When finalization encounters tiebreakers, it:
1. Sets status to "finalizing"
2. Creates tiebreakers
3. Should set status to "tiebreaker_pending"
4. **BUG**: Sometimes stays in "finalizing" instead

This prevents the force re-finalize logic from working because it only handles "tiebreaker_pending" status.

## Solution Overview
1. Reset the round status from "finalizing" to "tiebreaker_pending"
2. Use the existing "Force Re-finalize" button
3. The system will apply completed tiebreakers and finish finalization

## Step-by-Step Fix

### Option 1: Using the Fix Script (Recommended)

#### 1. Get the Round ID
Find the stuck round ID (e.g., `TFCR-15`) from the URL or admin panel.

#### 2. Run the Fix Script
```bash
npx tsx scripts/fix-stuck-finalization.ts TFCR-15
```

Replace `TFCR-15` with your actual round ID.

#### 3. Expected Output
```
🔧 Fixing stuck finalization for round: TFCR-15

Round 15:
  Status: finalizing
  Type: normal
  Tiebreakers: 2

✅ Found 2 completed tiebreakers:
   - Vinícius Júnior → Team TFCT-1 (£150)
   - Erling Haaland → Team TFCT-3 (£200)

✅ Round status reset to "tiebreaker_pending"

📋 Next steps:
   1. Go to the round page in the admin panel
   2. Click "Force Re-finalize" button
   3. The system will apply the completed tiebreakers and continue finalization
```

#### 4. Force Re-finalize
1. Go to the round page: `/sub-admin/TFCS-X/auction/rounds/TFCR-15`
2. Click the **"Force Re-finalize"** button
3. The system will:
   - Apply all completed tiebreakers
   - Continue finalization without creating duplicates
   - Complete the round if no more ties exist

### Option 2: Manual Database Update

If you prefer to update the database directly:

```sql
-- Check current status
SELECT id, roundNumber, status, roundType 
FROM rounds 
WHERE id = 'TFCR-15';

-- Check tiebreakers
SELECT id, status, winningTeamId, winningBid
FROM tiebreakers
WHERE roundId = 'TFCR-15';

-- Reset status to tiebreaker_pending
UPDATE rounds 
SET status = 'tiebreaker_pending' 
WHERE id = 'TFCR-15';
```

Then follow step 4 from Option 1.

## How Force Re-finalize Works

When you click "Force Re-finalize" on a `tiebreaker_pending` round, the system:

### 1. Checks for Completed Tiebreakers
```typescript
const completedTiebreakers = await prisma.tiebreakers.findMany({
  where: { 
    roundId, 
    status: 'completed', 
    winningTeamId: { not: null } 
  }
});
```

### 2. Applies Each Completed Tiebreaker
```typescript
for (const tb of completedTiebreakers) {
  // Check if already applied
  const alreadyApplied = state?.allocatedPlayers?.includes(tb.basePlayerId);
  
  if (!alreadyApplied && tb.winningTeamId && tb.winningBid) {
    // Apply the tiebreaker result
    await applyTiebreakerResult(tb.id, tb.winningTeamId, tb.winningBid);
    
    // Update finalization state to prevent re-processing
    await updateFinalizationState(roundId, {
      allocatedTeams: [...allocatedTeams, tb.winningTeamId],
      allocatedPlayers: [...allocatedPlayers, tb.basePlayerId],
      processedAllocations: [...allocations, newAllocation]
    });
  }
}
```

### 3. Continues Finalization
- Runs `finalizeRound()` again
- Uses the updated finalization state to skip already-allocated players
- Creates new tiebreakers if more ties are detected
- Completes the round if no more ties exist

## Preventing This Issue

### For Developers
The issue occurs when:
1. Finalization starts (status → "finalizing")
2. Tiebreakers are created
3. Status update to "tiebreaker_pending" fails or is skipped
4. Round stays stuck in "finalizing"

**Prevention**: Ensure status updates are atomic and always execute:
```typescript
// After creating tiebreakers
await prisma.rounds.update({
  where: { id: roundId },
  data: { status: 'tiebreaker_pending' }
});
```

### For Admins
If you see a round stuck in "finalizing":
1. Don't panic - data is safe
2. Check if tiebreakers exist and are completed
3. Run the fix script
4. Use Force Re-finalize

## Troubleshooting

### Script Says "Active Tiebreakers Found"
```
❌ Cannot fix: There are still active tiebreakers that need to be resolved.
   Please complete or resolve these tiebreakers first.
```

**Solution**: Complete the active tiebreakers first:
1. Go to the round page
2. Find the active tiebreakers section
3. Either:
   - Let teams submit bids, OR
   - Use "Spin & Resolve" to randomly resolve them

### Script Says "No Completed Tiebreakers"
```
⚠️  No completed tiebreakers found.
   Resetting to "pending_finalization" instead.
```

**Solution**: The script resets to "pending_finalization" automatically. Just finalize normally.

### Force Re-finalize Creates Duplicate Tiebreakers
This shouldn't happen because the code checks `finalizationState.allocatedPlayers` before creating new tiebreakers.

If it does happen:
1. Check the `finalizationState` column in the database
2. Ensure completed tiebreakers are marked with `winningTeamId`
3. Report the issue with round ID and logs

### Round Still Stuck After Force Re-finalize
Check the finalization logs (new feature):
1. Click "View Logs" button after finalization
2. Look for error messages in red
3. Common issues:
   - Budget validation errors
   - Database constraint violations
   - Missing player data

## Related Files

### Scripts
- `scripts/fix-stuck-finalization.ts` - Fix script

### API Routes
- `app/api/admin/rounds/[id]/finalize/route.ts` - Main finalization endpoint
- `app/api/admin/rounds/[id]/finalize-stream/route.ts` - Streaming logs endpoint

### Core Logic
- `lib/auction/finalize-round.ts` - Finalization logic
- `lib/auction/tiebreaker.ts` - Tiebreaker handling

### UI Components
- `components/auction/RoundDetailClient.tsx` - Admin round page with Force Re-finalize button

## Technical Details

### Round Status Flow
```
draft
  ↓ (Start Round)
active
  ↓ (Timer expires or Stop Early)
pending_finalization / expired_pending_finalization
  ↓ (Finalize)
finalizing (LOCK)
  ↓ (If ties detected)
tiebreaker_pending
  ↓ (Teams resolve tiebreakers)
finalizing (LOCK)
  ↓ (Apply results)
completed
```

### Finalization State Schema
```typescript
interface FinalizationState {
  previewMode?: boolean;
  allocatedTeams: string[];      // Team IDs that got players
  allocatedPlayers: string[];    // Player IDs that were allocated
  processedAllocations: Array<{
    teamId: string;
    basePlayerId: string;
    playerName: string;
    amount: number;
    acquisitionType: string;
  }>;
}
```

This state prevents duplicate allocations when re-running finalization.

### Database Schema
```sql
-- rounds table
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,  -- 'finalizing', 'tiebreaker_pending', etc.
  finalizationState JSONB,  -- Stores allocation state
  -- ... other fields
);

-- tiebreakers table
CREATE TABLE tiebreakers (
  id TEXT PRIMARY KEY,
  roundId TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'active', 'completed'
  winningTeamId TEXT,    -- NULL until resolved
  winningBid INTEGER,    -- NULL until resolved
  -- ... other fields
);
```

## Summary

**Quick Fix:**
```bash
# 1. Run fix script
npx tsx scripts/fix-stuck-finalization.ts TFCR-15

# 2. Go to admin panel and click "Force Re-finalize"
```

**What Happens:**
- Completed tiebreakers are applied
- Finalization continues from where it left off
- Round completes if no more ties exist

**Safe to Use:**
- No data loss
- No duplicate allocations
- Idempotent (can run multiple times safely)
