# Sub-Admin Season Access Fix

## Problem
Sub-admin dashboard was showing "No Seasons Assigned" because the code was trying to query a non-existent `sub_admin_seasons` table, while the actual season assignments are stored in the `assigned_seasons` JSONB column in the `users` table.

## Root Cause
There was a mismatch between:
- **Prisma schema**: Defined a `sub_admin_seasons` relation table
- **Database schema**: No such table exists
- **API implementation**: Uses `assigned_seasons` JSONB column in `users` table
- **Dashboard code**: Was trying to query the non-existent `sub_admin_seasons` table

## Solution
Updated the sub-admin dashboard and related functions to use the `assigned_seasons` JSONB column from the `users` table, which is what the API already uses.

## Files Changed
1. **app/(admin)/sub-admin/page.tsx**
   - Changed from querying `prisma.sub_admin_seasons.findMany()` 
   - To querying `prisma.users.findUnique()` and reading `assignedSeasons` field

2. **lib/team-auth.ts**
   - Updated `getAssignedSeasons()` function to read from `users.assignedSeasons` JSONB column
   - Removed dependency on non-existent `sub_admin_seasons` table

## Verification

To verify the `assigned_seasons` column exists in your database, run:
```bash
psql $DATABASE_URL -f scripts/verify-assigned-seasons-column.sql
```

This script will:
1. Check if the column exists
2. Add it if it doesn't exist (safe to run multiple times)
3. Show all sub-admins and their season assignments

## How to Assign Seasons to Sub-Admins

### Via Super Admin UI
1. Login as Super Admin
2. Navigate to **Super Admin > Sub-Admin Management**
3. Click **Edit** on a sub-admin
4. Check the seasons you want to assign in the **Season Access** section
5. Click **Update Sub-Admin**

### Via Database (if needed)
```sql
-- View current assignments
SELECT id, name, email, assigned_seasons 
FROM users 
WHERE role = 'SUB_ADMIN';

-- Assign seasons to a sub-admin
UPDATE users 
SET assigned_seasons = '["season-id-1", "season-id-2"]'::jsonb
WHERE id = 'sub-admin-user-id';

-- Get season IDs
SELECT id, name, is_active FROM seasons ORDER BY created_at DESC;
```

## Data Structure
The `assigned_seasons` column in the `users` table is a JSONB array of season IDs:
```json
["season-uuid-1", "season-uuid-2", "season-uuid-3"]
```

## Testing
After the fix:
1. Sub-admins with assigned seasons will see them on their dashboard
2. Sub-admins without assigned seasons will see "No Seasons Assigned" message
3. Only assigned seasons will be accessible to each sub-admin

## Notes
- The `sub_admin_seasons` model in the Prisma schema is not being used
- All season assignments are managed through the `assigned_seasons` JSONB column
- The API routes already use this approach correctly
- Empty array `[]` means no seasons assigned (no access)
