# Add Audit Logs Table Migration

This migration adds the `audit_logs` table to track all administrative actions in the system.

## Run the Migration

Execute the following SQL file in your PostgreSQL database:

```bash
psql $DATABASE_URL -f prisma/migrations/add_audit_logs.sql
```

Or copy and paste the contents of `prisma/migrations/add_audit_logs.sql` into your database client.

## What This Adds

- **audit_logs table**: Tracks all admin actions including:
  - User information (ID, email, role)
  - Action type (CREATE, UPDATE, DELETE, etc.)
  - Entity information (type, ID, name)
  - Season context
  - Additional details (JSON)
  - IP address and user agent
  - Timestamp

- **Indexes**: For optimized queries on:
  - user_id
  - season_id
  - action
  - created_at

## After Running Migration

1. Regenerate Prisma Client:
   ```bash
   npx prisma generate
   ```

2. Restart your development server

## Verification

Check that the table was created:

```sql
SELECT * FROM audit_logs LIMIT 1;
```

The sub-admin management page will now show action counts for each sub-admin.
