# Fix: Add preview_finalized Status to Database

## Problem

The error you're seeing:
```
new row for relation "rounds" violates check constraint "rounds_status_check"
```

This happens because the database constraint doesn't include `preview_finalized` as a valid status value.

## Root Cause

The `rounds` table has a CHECK constraint that only allows these statuses:
- draft
- active
- finalizing
- completed
- expired_pending_finalization
- pending_finalization
- tiebreaker_pending
- cancelled

But the code is trying to set status to `preview_finalized` (which is needed for manual finalization mode).

## Solution

Run the migration script to add `preview_finalized` to the allowed statuses.

### Option 1: Using TypeScript (Recommended)

```bash
npx tsx scripts/add-preview-finalized-status.ts
```

### Option 2: Using SQL Directly

```bash
psql -d your_database_name -f scripts/add-preview-finalized-status.sql
```

Or run this SQL in your database client:

```sql
-- Drop the existing check constraint
ALTER TABLE rounds DROP CONSTRAINT IF EXISTS rounds_status_check;

-- Add the new check constraint with preview_finalized included
ALTER TABLE rounds ADD CONSTRAINT rounds_status_check CHECK (status IN (
  'draft',
  'active',
  'finalizing',
  'completed',
  'expired_pending_finalization',
  'pending_finalization',
  'tiebreaker_pending',
  'preview_finalized',
  'cancelled'
));
```

## After Migration

Once the migration is complete:

1. ✅ The `preview_finalized` status will be accepted
2. ✅ Manual finalization mode will work correctly
3. ✅ Tiebreaker resolution will complete successfully
4. ✅ Preview allocations will be saved properly

## What This Enables

With `preview_finalized` status:
- Admins can finalize rounds in preview mode
- Results are calculated and saved to `preview_allocations` table
- Results remain hidden from teams
- Admin can review before making public
- When ready, admin clicks "Make Public" to change status to `completed`

## Verification

After running the migration, verify it worked:

```sql
-- Check the constraint definition
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'rounds_status_check';
```

You should see `preview_finalized` in the list of allowed values.

## Files Created

1. ✅ `scripts/add-preview-finalized-status.sql` - SQL migration
2. ✅ `scripts/add-preview-finalized-status.ts` - TypeScript migration script
3. ✅ `FIX-PREVIEW-FINALIZED-STATUS.md` - This instruction file

## Status

⚠️ **ACTION REQUIRED** - Run the migration script to fix the error
