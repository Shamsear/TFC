# Fix REFUND TransactionType Enum Error

## Problem
When approving a release request, you get this error:
```
invalid input value for enum "TransactionType": "REFUND"
```

This means the database's `TransactionType` enum doesn't have the `REFUND` value, even though it's defined in the Prisma schema.

## Solution
Add the `REFUND` value to the database enum.

## Steps to Fix

### Option 1: Using the SQL Script (Recommended)

1. **Run the migration script:**
   ```bash
   psql -h your-database-host -U your-username -d your-database-name -f scripts/add-refund-transaction-type.sql
   ```

2. **Or if using a connection string:**
   ```bash
   psql "your-connection-string" -f scripts/add-refund-transaction-type.sql
   ```

3. **Verify it worked:**
   ```sql
   SELECT enumlabel 
   FROM pg_enum 
   WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionType')
   ORDER BY enumsortorder;
   ```
   
   You should see:
   ```
   INITIAL_PURSE
   PLAYER_PURCHASE
   PLAYER_SALE
   ADJUSTMENT
   REFUND
   ```

### Option 2: Manual SQL Command

Connect to your database and run:

```sql
ALTER TYPE "TransactionType" ADD VALUE 'REFUND';
```

### Option 3: Using Prisma Migrate

If you're using Prisma migrations:

1. **Create a new migration:**
   ```bash
   npx prisma migrate dev --name add-refund-transaction-type
   ```

2. **Apply to production:**
   ```bash
   npx prisma migrate deploy
   ```

## Verification

After running the migration, test the release approval:

1. Go to the admin release requests page
2. Try to approve a release request
3. It should now work without the enum error

## What This Does

The script adds `REFUND` as a valid value to the `TransactionType` enum in PostgreSQL. This allows the financial ledger to record refund transactions when players are released.

## Why This Happened

The Prisma schema was updated to include `REFUND` in the enum, but the database wasn't updated. This can happen when:
- Schema changes are made without running migrations
- Database is restored from an old backup
- Manual schema edits were made

## Related Files

- `scripts/add-refund-transaction-type.sql` - The migration script
- `prisma/schema.prisma` - Contains the enum definition
- `app/api/admin/release-requests/[id]/approve/route.ts` - Uses REFUND transaction type

## After Fixing

Once fixed, the release approval process will:
1. Update transfer_history status to 'RELEASED'
2. Refund the team budget
3. Create a ledger entry with type 'REFUND' ✅ (this was failing)
4. Update request status to 'approved'
