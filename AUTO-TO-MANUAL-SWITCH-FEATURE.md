# Auto-to-Manual Switch Feature

## Overview

When an admin clicks "Preview Results" on ANY round (even auto-finalize rounds), the system now automatically switches the round's `finalizationMode` from "auto" to "manual".

## Why This Matters

**Problem Before:**
- Admin creates round with "Auto Finalize" mode
- Admin clicks "Preview Results" to review before publishing
- But round is still in "auto" mode
- Confusing behavior - is it auto or manual?

**Solution Now:**
- Admin clicks "Preview Results" = explicit choice to review
- System switches to "manual" mode automatically
- Results stay hidden until admin makes them public
- Clear, predictable behavior

## How It Works

### Scenario 1: Preview with Tiebreakers

```
1. Round created with finalizationMode: "auto"
2. Admin clicks "Preview Results"
3. System detects ties
4. System updates round:
   - finalizationMode: "auto" → "manual"
   - status: "tiebreaker_pending"
   - finalizationState.previewMode: true
5. Teams resolve tiebreakers
6. Results saved to preview_allocations
7. Round status: "preview_finalized"
8. Admin clicks "Make Public"
9. Results applied and visible
```

### Scenario 2: Preview without Tiebreakers

```
1. Round created with finalizationMode: "auto"
2. Admin clicks "Preview Results"
3. No ties detected
4. System updates round:
   - finalizationMode: "auto" → "manual"
   - status: "preview_finalized"
   - Saves to preview_allocations table
5. Admin reviews results (only admin can see)
6. Admin clicks "Make Public"
7. Results applied and visible to teams
```

## Code Changes

### File: `app/api/admin/rounds/[id]/finalize/route.ts`

**When tiebreakers are created in preview mode:**
```typescript
await prisma.rounds.update({
  where: { id: roundId },
  data: { 
    status: 'tiebreaker_pending',
    finalizationMode: 'manual', // ← Switch to manual
    finalizationState: {
      previewMode: true,
      allocatedTeams: [...],
      allocatedPlayers: [...],
      processedAllocations: [...]
    }
  }
});
```

**When no tiebreakers (direct preview):**
```typescript
// Save preview allocations
await prisma.preview_allocations.createMany({ ... });

// Update round
await prisma.rounds.update({
  where: { id: roundId },
  data: {
    status: 'preview_finalized',
    finalizationMode: 'manual', // ← Switch to manual
    finalizationState: null
  }
});
```

## User Experience

### Before Fix
```
Admin: "I want to preview this auto-finalize round"
[Clicks Preview Results]
System: "Results applied immediately!"
Admin: "Wait, what? I wanted to review first!"
```

### After Fix
```
Admin: "I want to preview this auto-finalize round"
[Clicks Preview Results]
System: "Switched to manual mode. Results saved for preview."
Admin: "Perfect! Let me review..."
[Reviews results]
Admin: "Looks good!"
[Clicks Make Public]
System: "Results now visible to teams."
```

## Benefits

✅ **Intuitive**: Clicking "Preview" means you want control
✅ **Safe**: Results never accidentally published
✅ **Flexible**: Can preview any round, regardless of initial mode
✅ **Clear**: Mode reflects actual behavior
✅ **Consistent**: Same behavior for all preview actions

## Edge Cases Handled

### Case 1: Auto Round, Admin Previews
- Initial: `finalizationMode: "auto"`
- Admin clicks "Preview Results"
- Result: `finalizationMode: "manual"`
- Outcome: Results stay hidden until "Make Public"

### Case 2: Manual Round, Admin Previews
- Initial: `finalizationMode: "manual"`
- Admin clicks "Preview Results"
- Result: `finalizationMode: "manual"` (no change)
- Outcome: Results stay hidden until "Make Public"

### Case 3: Auto Round, Timer Expires
- Initial: `finalizationMode: "auto"`
- Timer expires naturally (no admin action)
- Result: `finalizationMode: "auto"` (no change)
- Outcome: Results applied immediately (as designed)

## Testing Checklist

- [ ] Create auto-finalize round
- [ ] Click "Preview Results" before timer expires
- [ ] Verify `finalizationMode` changed to "manual"
- [ ] Verify results saved to `preview_allocations`
- [ ] Verify round status is `preview_finalized`
- [ ] Verify teams cannot see results
- [ ] Click "Make Public"
- [ ] Verify results applied and visible to teams

## Database Fields

**rounds table:**
- `finalizationMode`: "auto" | "manual"
- `status`: Various statuses including "preview_finalized"
- `finalizationState`: JSON field storing preview mode flag

**preview_allocations table:**
- Stores preview results before they're made public
- Only visible to admins
- Applied to `transfer_history` when "Make Public" is clicked

## Status

✅ **IMPLEMENTED** - Feature complete and ready for testing
⚠️ **REQUIRES**: Prisma client regeneration (stop server, run `npx prisma generate`, restart)
