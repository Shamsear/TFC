# Preview Mode Tiebreaker Fix

## Problem

When using preview mode with tiebreakers:
1. Admin clicks "Preview Results"
2. Tiebreaker is created
3. Teams resolve tiebreaker
4. **BUG**: Results are applied immediately instead of saved to preview_allocations
5. Tiebreaker winning amount not saved for preview

## Root Cause

When preview mode creates tiebreakers, it doesn't set a flag to indicate "this is preview mode". So when the tiebreaker is resolved and finalization resumes, the system doesn't know it should save to `preview_allocations` instead of applying results immediately.

## The Fix

### Code Change

**File:** `app/api/admin/rounds/[id]/finalize/route.ts`

When creating tiebreakers in preview mode, now sets `finalizationState` with preview flag:

```typescript
await prisma.rounds.update({
  where: { id: roundId },
  data: { 
    status: 'tiebreaker_pending',
    finalizationState: {
      previewMode: true,  // ← This flag tells the system it's preview mode
      allocatedTeams: result.allocations?.map(a => a.teamId) || [],
      allocatedPlayers: result.allocations?.map(a => a.basePlayerId) || [],
      processedAllocations: result.allocations || []
    }
  }
});
```

### How It Works

**Before Fix:**
```
Preview Mode → Create Tiebreaker → Resolve → Resume Finalization
                                              ↓
                                    ❌ Apply results immediately (WRONG!)
```

**After Fix:**
```
Preview Mode → Create Tiebreaker (set previewMode: true) → Resolve → Resume Finalization
                                                                      ↓
                                                            Check finalizationState.previewMode
                                                                      ↓
                                                            ✅ Save to preview_allocations (CORRECT!)
```

### Tiebreaker Resolution Logic

**File:** `lib/auction/tiebreaker.ts`

Already checks for preview mode:
```typescript
const finalizationState = tiebreaker.round.finalizationState as any;
const isPreviewMode = finalizationState?.previewMode === true;

if (isPreviewMode) {
  // Save to preview_allocations table
  await prisma.preview_allocations.createMany({ ... });
  
  // Mark as preview_finalized (not completed)
  await prisma.rounds.update({
    where: { id: tiebreaker.roundId },
    data: { status: 'preview_finalized' }
  });
} else {
  // Normal mode - apply results immediately
  await applyFinalizationResults(...);
  
  await prisma.rounds.update({
    where: { id: tiebreaker.roundId },
    data: { status: 'completed' }
  });
}
```

## What This Fixes

✅ **Tiebreaker amounts saved correctly** in preview mode
✅ **Results stay hidden** from teams until admin makes them public
✅ **Preview allocations** saved to `preview_allocations` table
✅ **Round status** set to `preview_finalized` (not `completed`)
✅ **Admin can review** before making results public

## Testing Flow

### Manual Preview Mode with Tiebreaker

1. Create round with "Manual Preview" mode
2. Teams submit bids
3. Timer expires
4. Admin clicks "Preview Results"
5. **Tie detected** → Tiebreaker created with `previewMode: true` flag
6. Teams resolve tiebreaker
7. **System checks flag** → Sees `previewMode: true`
8. **Saves to preview_allocations** (not transfer_history)
9. **Round status** → `preview_finalized`
10. Admin reviews results (only admin can see)
11. Admin clicks "Make Public"
12. Results applied and visible to teams

## Required Steps

Before this works, you need to:

1. **Run database migration** (add `preview_finalized` status):
   ```bash
   npx tsx scripts/add-preview-finalized-status.ts
   ```

2. **Regenerate Prisma client** (recognize `finalizationState` field):
   ```bash
   npx prisma generate
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

## Files Modified

1. ✅ `app/api/admin/rounds/[id]/finalize/route.ts` - Set previewMode flag when creating tiebreakers
2. ✅ `lib/auction/tiebreaker.ts` - Already checks previewMode flag (no changes needed)

## Status

✅ **FIX COMPLETE** - Preview mode now correctly handles tiebreakers
⚠️ **MIGRATION REQUIRED** - Run migration and regenerate Prisma client
