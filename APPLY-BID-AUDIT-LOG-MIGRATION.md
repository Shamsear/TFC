# Apply Bid Audit Log Migration

## Error
You're getting this error because the Prisma client still expects `Int` for `bid_audit_log.id`, but the schema now defines it as `String`.

```
Argument `id`: Invalid value provided. Expected Int, provided String.
```

## Solution Steps

### Step 1: Stop the Dev Server
Press `Ctrl+C` in the terminal where your Next.js dev server is running.

### Step 2: Apply the Database Migration
Run the SQL migration to change the table structure:

```bash
# Using psql (if you have it installed)
psql -d your_database_url -f prisma/migrations/change_bid_audit_log_id_to_string.sql

# OR using Prisma's raw SQL execution
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
const sql = fs.readFileSync('prisma/migrations/change_bid_audit_log_id_to_string.sql', 'utf-8');
await prisma.\$executeRawUnsafe(sql);
await prisma.\$disconnect();
"
```

### Step 3: Regenerate Prisma Client
After the migration is applied, regenerate the Prisma client:

```bash
npx prisma generate
```

### Step 4: Restart Dev Server
Start your development server again:

```bash
npm run dev
```

## Alternative: Quick Fix (Revert Schema Change)

If you want to keep the system running without migration, you can temporarily revert the schema change:

### Option A: Keep Integer IDs (Revert)
In `prisma/schema.prisma`, change back to:

```prisma
model bid_audit_log {
  id             Int      @id @default(autoincrement())
  // ... rest of fields
}
```

Then remove the `generateBidAuditId()` usage in `app/api/auction/rounds/[id]/bids/route.ts`:

```typescript
// Remove the ID generation, let database auto-increment
await prisma.bid_audit_log.create({
  data: {
    // Don't include 'id' field - let it auto-increment
    roundId,
    teamId,
    action: teamRoundBid ? 'update' : 'create',
    encryptedBids,
    timestamp: new Date()
  }
});
```

Then regenerate:
```bash
npx prisma generate
```

### Option B: Apply Migration (Recommended)
Follow Steps 1-4 above to properly migrate to String IDs.

## What the Migration Does

The migration script (`prisma/migrations/change_bid_audit_log_id_to_string.sql`):

1. Drops the existing `bid_audit_log` table (audit logs are safe to recreate)
2. Recreates it with `id TEXT PRIMARY KEY` instead of `id INT`
3. Recreates all indexes
4. Initializes the `TFCBA` counter in `id_counters` table

**Note:** This will delete existing bid audit logs. If you need to preserve them, you'll need a more complex migration with data transformation.

## Verification

After applying the migration and regenerating Prisma client:

1. Try placing a bid in an auction round
2. Check that no error occurs
3. Verify the `bid_audit_log` table has records with IDs like `TFCBA-1`, `TFCBA-2`, etc.

```sql
SELECT id, round_id, team_id, action, timestamp 
FROM bid_audit_log 
ORDER BY timestamp DESC 
LIMIT 5;
```

You should see IDs in the format `TFCBA-1`, `TFCBA-2`, etc.
