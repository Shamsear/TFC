# Transfer Status Update - SWAPPED_OUT

## Summary
Updated the `TransferStatus` enum to use `SWAPPED_OUT` instead of `TRANSFERRED_OUT` to better reflect the player swap system.

## Changes Made

### 1. Database Migration Script ✅
**File**: `scripts/add-transfer-status-column.sql`

**Before**:
```sql
CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'RELEASED', 'TRANSFERRED_OUT');
```

**After**:
```sql
CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'RELEASED', 'SWAPPED_OUT');
```

### 2. Prisma Schema ✅
**File**: `prisma/schema.prisma`

**Before**:
```prisma
enum TransferStatus {
  ACTIVE
  RELEASED
  TRANSFERRED_OUT
}
```

**After**:
```prisma
enum TransferStatus {
  ACTIVE
  RELEASED
  SWAPPED_OUT
}
```

### 3. Swap API ✅
**File**: `app/api/admin/players/swap/route.ts`

Updated to mark old transfers as `SWAPPED_OUT`:
```typescript
await tx.transfer_history.update({
  where: { id: player.transfer.id },
  data: {
    status: 'SWAPPED_OUT',
    releaseNotes: swapDescription
  }
});
```

### 4. Transfer API (Deprecated) ✅
**File**: `app/api/admin/players/transfer/route.ts`

Updated to mark old transfers as `SWAPPED_OUT`:
```typescript
await tx.transfer_history.update({
  where: { id: existingTransfer.id },
  data: {
    status: 'SWAPPED_OUT',
    releaseNotes: notes || `Swapped to another team: ${player.name}`
  }
});
```

### 5. Prisma Client ✅
Regenerated Prisma client with updated enum:
```bash
npx prisma generate
```

### 6. Documentation ✅
Updated all documentation files:
- `PLAYER-SWAP-SYSTEM.md`
- `TRANSFER-STATUS-MIGRATION-COMPLETE.md`

## Status Values

### ACTIVE
- Player is currently with the team
- Used for all active squad members
- Default status for new transfers

### RELEASED
- Player was released from the team
- No longer part of any team
- Budget refunded to original team

### SWAPPED_OUT
- Player was swapped to another team
- Part of a player exchange
- Original value preserved in new transfer

## Why SWAPPED_OUT?

### Better Semantics
- "Swapped" accurately describes the two-way exchange
- "Transferred" implies one-way movement
- Clearer intent in historical records

### Matches Business Logic
- System uses player swaps, not transfers
- Teams exchange players, not give them away
- Budget adjusts based on value difference

### Historical Accuracy
- Easy to identify swap transactions
- Can track which players were involved in swaps
- Clear audit trail for player movements

## Migration Impact

### If Migration Already Run
If you already ran the migration with `TRANSFERRED_OUT`, you need to:

1. **Drop and recreate the enum**:
```sql
-- Update existing values first
UPDATE transfer_history SET status = 'ACTIVE' WHERE status = 'TRANSFERRED_OUT';

-- Drop the old enum
ALTER TABLE transfer_history ALTER COLUMN status TYPE TEXT;
DROP TYPE "TransferStatus";

-- Create new enum
CREATE TYPE "TransferStatus" AS ENUM ('ACTIVE', 'RELEASED', 'SWAPPED_OUT');

-- Update column to use new enum
ALTER TABLE transfer_history ALTER COLUMN status TYPE "TransferStatus" USING status::"TransferStatus";
```

2. **Run Prisma generate**:
```bash
npx prisma generate
```

### If Migration Not Yet Run
Simply run the updated migration script:
```bash
psql -U your_user -d your_database -f scripts/add-transfer-status-column.sql
```

## Testing

### Verify Enum Values
```sql
SELECT enum_range(NULL::\"TransferStatus\");
-- Expected: {ACTIVE,RELEASED,SWAPPED_OUT}
```

### Check Existing Data
```sql
SELECT status, COUNT(*) 
FROM transfer_history 
GROUP BY status;
```

### Test Swap Operation
1. Create a swap between two teams
2. Verify old transfers marked as `SWAPPED_OUT`
3. Verify new transfers created as `ACTIVE`
4. Check `release_notes` contains swap description

## Related Files

- `scripts/add-transfer-status-column.sql` - Migration script
- `prisma/schema.prisma` - Prisma schema
- `app/api/admin/players/swap/route.ts` - Swap API
- `app/api/admin/players/transfer/route.ts` - Transfer API (deprecated)
- `PLAYER-SWAP-SYSTEM.md` - Swap system documentation
- `TRANSFER-STATUS-MIGRATION-COMPLETE.md` - Migration guide

## Status

✅ All code updated
✅ Prisma client regenerated
✅ Documentation updated
✅ No TypeScript errors
⏳ Migration ready to run
