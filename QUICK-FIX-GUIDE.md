# Quick Fix Guide: Sub-Admin No Seasons Issue

## Problem
Sub-admin dashboard shows "No Seasons Assigned" even though seasons should be assigned.

## Quick Fix (3 Steps)

### Step 1: Verify Database Column Exists
Run this command:
```bash
psql $DATABASE_URL -f scripts/verify-assigned-seasons-column.sql
```

This will check and add the `assigned_seasons` column if missing.

### Step 2: Assign Seasons to Sub-Admins

**Option A: Use Super Admin UI (Easiest)**
1. Login as Super Admin
2. Go to: Super Admin → Sub-Admin Management
3. Click "Edit" on a sub-admin
4. Check the seasons you want to assign
5. Click "Update Sub-Admin"

**Option B: Use Database Script**
```bash
# View the helper script with examples
psql $DATABASE_URL -f scripts/assign-seasons-to-sub-admins.sql
```

**Option C: Quick SQL Command**
```sql
-- Replace the IDs with your actual values
UPDATE users 
SET assigned_seasons = '["your-season-id"]'::jsonb
WHERE id = 'your-sub-admin-id' AND role = 'SUB_ADMIN';
```

### Step 3: Test
1. Login as the sub-admin
2. Go to `/sub-admin` dashboard
3. You should now see the assigned seasons

## Get Season and User IDs

```sql
-- Get season IDs
SELECT id, name FROM seasons ORDER BY created_at DESC;

-- Get sub-admin user IDs
SELECT id, name, email FROM users WHERE role = 'SUB_ADMIN';
```

## Common Scenarios

### Assign Active Season to All Sub-Admins
```sql
UPDATE users 
SET assigned_seasons = (
    SELECT jsonb_agg(id) FROM seasons WHERE is_active = true
)
WHERE role = 'SUB_ADMIN';
```

### Assign All Seasons to One Sub-Admin
```sql
UPDATE users 
SET assigned_seasons = (
    SELECT jsonb_agg(id) FROM seasons
)
WHERE id = 'sub-admin-id' AND role = 'SUB_ADMIN';
```

## Troubleshooting

**Still showing "No Seasons Assigned"?**
1. Check the sub-admin has seasons assigned:
   ```sql
   SELECT assigned_seasons FROM users WHERE id = 'sub-admin-id';
   ```
2. Verify the season IDs are valid:
   ```sql
   SELECT id FROM seasons;
   ```
3. Clear browser cache and refresh

**Can't access Super Admin UI?**
- Use the database scripts in `scripts/assign-seasons-to-sub-admins.sql`

## Files Reference
- 📄 `FIX-SUB-ADMIN-NO-SEASONS.md` - Full documentation
- 📄 `scripts/verify-assigned-seasons-column.sql` - Column verification
- 📄 `scripts/assign-seasons-to-sub-admins.sql` - Assignment helper
- 📄 `SUB-ADMIN-SEASON-ACCESS-FIX.md` - Technical details
