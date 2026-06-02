# Safe Migration Instructions

## Problem
Prisma is warning about primary key changes on the `news` table, which could cause data loss.

## Solution
Run the SQL migration directly to safely add the new features without touching the `news` primary key.

## Steps

### 1. Run the Safe Migration Script
```bash
# Using psql
psql $DATABASE_URL -f scripts/safe-add-team-awards-and-news-column.sql

# OR using the Vercel Postgres connection string
psql "postgres://user:pass@host/db?sslmode=require" -f scripts/safe-add-team-awards-and-news-column.sql
```

### 2. Introspect the Database to Update Prisma
After running the migration, update Prisma's understanding of the database:
```bash
npx prisma db pull
```

This will update your `schema.prisma` to match the actual database state.

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Verify Everything Works
```bash
# Check that the migration was successful
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'news' AND column_name = 'edited_by_admin';"

psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'team_awards';"
```

## What This Migration Does

✅ Adds `edited_by_admin` column to `news` table (if not exists)
✅ Creates `team_awards` table with all constraints
✅ Creates `TeamAwardType` enum
✅ Adds all necessary indexes
✅ **Does NOT modify the `news` primary key**
✅ Safe and idempotent (can be run multiple times)

## Alternative: Use Prisma Migrate with --skip-generate

If you want to use Prisma's migration system:

```bash
# Create the migration without applying it
npx prisma migrate dev --create-only --name add_team_awards

# Manually edit the generated migration file to remove any news PK changes
# Then apply it
npx prisma migrate deploy
```

## Post-Migration

After the migration is complete, your application will have:
- ✅ Team Awards system fully functional
- ✅ News `edited_by_admin` column preserved with all 38 existing values
- ✅ No primary key changes or data loss
