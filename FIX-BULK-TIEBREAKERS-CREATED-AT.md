# Fix bulk_tiebreakers Missing created_at Column

## Issue
The `bulk_tiebreakers` table is missing the `created_at` column that the Prisma schema expects.

**Error:**
```
The column `bulk_tiebreakers.created_at` does not exist in the current database.
```

## Root Cause
The original migration file `scripts/migrations/006-create-bulk-tiebreaker-tables.sql` did not include a `created_at` column, but the Prisma schema defines it:

```prisma
model bulk_tiebreakers {
  // ... other fields
  createdAt DateTime @default(now()) @map("created_at")
}
```

## Solution

### SQL Migration File Created
**File:** `prisma/migrations/add_created_at_to_bulk_tiebreakers.sql`

```sql
-- Migration: Add created_at column to bulk_tiebreakers table
-- Date: 2024-01-16
-- Description: Add missing created_at timestamp column

-- Add created_at column to bulk_tiebreakers
ALTER TABLE bulk_tiebreakers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Update existing rows to have created_at set to completed_at or NOW()
UPDATE bulk_tiebreakers 
SET created_at = COALESCE(completed_at, NOW())
WHERE created_at IS NULL;

-- Add comment
COMMENT ON COLUMN bulk_tiebreakers.created_at IS 'Timestamp when the tiebreaker was created';
```

## How to Apply

### Option 1: Using psql (Recommended)
```bash
psql -h <your-host> -U <your-user> -d <your-database> -f prisma/migrations/add_created_at_to_bulk_tiebreakers.sql
```

### Option 2: Using Database GUI
1. Open your database management tool (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open and execute the SQL file: `prisma/migrations/add_created_at_to_bulk_tiebreakers.sql`

### Option 3: Direct SQL Execution
Run this SQL directly in your database:

```sql
ALTER TABLE bulk_tiebreakers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

UPDATE bulk_tiebreakers 
SET created_at = COALESCE(completed_at, NOW())
WHERE created_at IS NULL;

COMMENT ON COLUMN bulk_tiebreakers.created_at IS 'Timestamp when the tiebreaker was created';
```

## Verification

After running the migration, verify the column exists:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bulk_tiebreakers' 
  AND column_name = 'created_at';
```

Expected result:
```
column_name | data_type                   | is_nullable | column_default
------------+-----------------------------+-------------+----------------
created_at  | timestamp with time zone    | NO          | now()
```

## Impact
- **Safe Migration:** Uses `IF NOT EXISTS` to prevent errors if already applied
- **Backward Compatible:** Sets default value for existing rows
- **No Data Loss:** Preserves all existing data
- **No Downtime:** Can be applied while application is running

## Related Tables Status
✅ `rounds` - Has `created_at` column
✅ `team_round_bids` - Has `last_updated` column (different naming)
✅ `tiebreakers` - Has `created_at` column
❌ `bulk_tiebreakers` - Missing `created_at` column (FIXED by this migration)

## After Migration
Once applied, the team auction page will load without errors and display bulk tiebreakers correctly.
