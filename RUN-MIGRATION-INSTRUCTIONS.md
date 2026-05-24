# Migration Instructions - Release & Swap Request Systems

## Error
You're seeing this error because the database tables don't exist yet:
```
type "public.RequestStatus" does not exist
```

## Solution: Run the Migration

### Step 1: Run the SQL Migration Script

You need to execute the migration script against your PostgreSQL database:

```bash
# Option 1: Using psql command line
psql -U your_username -d your_database_name -f scripts/add-request-tables.sql

# Option 2: Using a database GUI tool (pgAdmin, DBeaver, etc.)
# Open scripts/add-request-tables.sql and execute it

# Option 3: Copy and paste the SQL directly into your database console
```

### Step 2: Verify Tables Were Created

After running the migration, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('release_requests', 'swap_requests', 'swap_request_players');

-- Check if enum exists
SELECT typname 
FROM pg_type 
WHERE typname = 'RequestStatus';

-- Check if columns were added to seasons
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'seasons' 
AND column_name IN ('release_window_open', 'swap_window_open');
```

### Step 3: Regenerate Prisma Client (Already Done)

The Prisma client has already been generated with the new models. If you need to regenerate:

```bash
npx prisma generate
```

### Step 4: Restart Your Development Server

After running the migration:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

## What the Migration Creates

### Tables:
1. **release_requests** - Stores player release requests from teams
2. **swap_requests** - Stores player swap requests between teams
3. **swap_request_players** - Stores individual players in swap requests

### Enum:
- **RequestStatus** - Values: pending, approved, rejected

### Season Columns:
- **release_window_open** (BOOLEAN) - Controls if teams can submit release requests
- **swap_window_open** (BOOLEAN) - Controls if teams can submit swap requests

### Transaction Type:
- Added **REFUND** to TransactionType enum (already in Prisma schema)

## Migration Script Location

The migration script is located at:
```
scripts/add-request-tables.sql
```

## After Migration

Once the migration is complete:
1. ✅ Release request system will work
2. ✅ Swap request system will work
3. ✅ Admin can toggle windows open/closed
4. ✅ Teams can submit requests
5. ✅ Admin can approve/reject requests

## Troubleshooting

### If you get "relation already exists" errors:
The tables might already exist. Check if they do:
```sql
\dt release_requests
\dt swap_requests
\dt swap_request_players
```

### If you get permission errors:
Make sure your database user has CREATE permissions:
```sql
GRANT CREATE ON SCHEMA public TO your_username;
```

### If the enum already exists:
You can skip creating it or drop and recreate:
```sql
-- Check if it exists
SELECT * FROM pg_type WHERE typname = 'RequestStatus';

-- If needed, drop it (be careful!)
DROP TYPE IF EXISTS "RequestStatus" CASCADE;
```

## Quick Start Command

If you have direct database access:

```bash
# Replace with your actual database connection details
psql postgresql://username:password@localhost:5432/database_name -f scripts/add-request-tables.sql
```

## Need Help?

If you encounter issues:
1. Check your database connection string in `.env`
2. Verify you have CREATE permissions
3. Check if tables already exist
4. Look at the error message for specific issues

## Summary

**Before you can use the Release and Swap Request systems, you MUST run the migration script!**

The systems are fully coded and ready, but the database schema needs to be updated first.
