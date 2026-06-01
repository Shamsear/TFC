# Fix: Sub-Admin Dashboard Showing "No Seasons Assigned"

## Issue Summary
Sub-admin users were unable to see any seasons on their dashboard, even though seasons were assigned to them through the Super Admin interface.

## Root Cause
The sub-admin dashboard code was querying a non-existent `sub_admin_seasons` table, while the actual season assignments are stored in the `assigned_seasons` JSONB column in the `users` table.

## Solution Applied

### 1. Code Changes
Updated two files to use the correct data source:

**File: `app/(admin)/sub-admin/page.tsx`**
- Changed from: `prisma.sub_admin_seasons.findMany()`
- Changed to: `prisma.users.findUnique()` reading `assignedSeasons` field

**File: `lib/team-auth.ts`**
- Updated `getAssignedSeasons()` function
- Now reads from `users.assignedSeasons` JSONB column

### 2. Database Column Verification
The `assigned_seasons` column already exists in the database schema:
```sql
"assigned_seasons" JSONB NOT NULL DEFAULT '[]'
```

To verify it exists in your live database, run:
```bash
psql $DATABASE_URL -f scripts/verify-assigned-seasons-column.sql
```

This script will:
- Check if the column exists
- Add it if missing (safe to run multiple times)
- Display all sub-admins and their assignments

## How to Assign Seasons to Sub-Admins

### Method 1: Super Admin UI (Recommended)
1. Login as **Super Admin**
2. Navigate to **Super Admin > Sub-Admin Management**
3. Click **Edit** on the sub-admin you want to update
4. In the **Season Access** section, check the seasons to assign
5. Click **Update Sub-Admin**

### Method 2: Direct Database Update
```sql
-- Get season IDs
SELECT id, name, is_active 
FROM seasons 
ORDER BY created_at DESC;

-- Assign seasons to a sub-admin
UPDATE users 
SET assigned_seasons = '["season-id-1", "season-id-2"]'::jsonb,
    updated_at = NOW()
WHERE id = 'sub-admin-user-id' 
  AND role = 'SUB_ADMIN';

-- Verify the update
SELECT id, name, email, assigned_seasons 
FROM users 
WHERE id = 'sub-admin-user-id';
```

## Testing the Fix

### 1. Check Sub-Admin Dashboard
1. Login as a sub-admin
2. Navigate to `/sub-admin`
3. You should now see:
   - Active season card (if assigned to active season)
   - List of all assigned seasons
   - Or "No Seasons Assigned" message if no seasons are assigned

### 2. Verify Season Access
1. Sub-admins should only see seasons they're assigned to
2. Clicking on a season should work without errors
3. All season management features should be accessible

## Data Structure

The `assigned_seasons` column stores an array of season IDs in JSONB format:
```json
["season-uuid-1", "season-uuid-2", "season-uuid-3"]
```

**Empty array** `[]` means no seasons assigned (no access).

## Files Modified
- ✅ `app/(admin)/sub-admin/page.tsx` - Dashboard page
- ✅ `lib/team-auth.ts` - Season access helper functions
- ✅ `scripts/verify-assigned-seasons-column.sql` - Verification script (new)
- ✅ `SUB-ADMIN-SEASON-ACCESS-FIX.md` - Technical documentation (new)
- ✅ `FIX-SUB-ADMIN-NO-SEASONS.md` - This file (new)

## Related Files (No Changes Needed)
- `app/api/super-admin/sub-admins/route.ts` - Already uses correct approach
- `app/api/super-admin/sub-admins/[id]/route.ts` - Already uses correct approach
- `components/admin/SubAdminForm.tsx` - Already uses correct approach

## Notes
- The Prisma schema defines a `sub_admin_seasons` model, but it's not used
- All season assignments are managed through the `assigned_seasons` JSONB column
- This approach is simpler and already implemented in the API layer
- No database migration needed if the column already exists

## Rollback (If Needed)
If you need to rollback these changes:
```bash
git checkout HEAD -- app/(admin)/sub-admin/page.tsx lib/team-auth.ts
```

However, this would break the functionality again, so rollback is not recommended.
