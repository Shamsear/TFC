# How to Assign Seasons to Sub-Admins

## Method 1: Using Super Admin UI (Easiest)
1. Login as Super Admin
2. Go to: **Super Admin → Sub-Admin Management**
3. Click **Edit** on the sub-admin
4. Check the seasons you want to assign
5. Click **Update Sub-Admin**

## Method 2: Using SQL (Direct)

### Step 1: Get the IDs you need

Run this to see seasons:
```sql
SELECT id, name FROM seasons ORDER BY season_number DESC;
```

Run this to see sub-admins:
```sql
SELECT id, name, email FROM users WHERE role = 'SUB_ADMIN';
```

### Step 2: Assign the season

Copy this template and replace the IDs:
```sql
UPDATE users 
SET assigned_seasons = '["YOUR-SEASON-ID-HERE"]'::jsonb
WHERE id = 'YOUR-SUB-ADMIN-ID-HERE';
```

**Example with real IDs:**
```sql
UPDATE users 
SET assigned_seasons = '["clx123abc"]'::jsonb
WHERE id = 'user456def';
```

### Step 3: Verify it worked

```sql
SELECT 
    name,
    email,
    assigned_seasons
FROM users 
WHERE role = 'SUB_ADMIN';
```

## Common Scenarios

### Assign Multiple Seasons
```sql
UPDATE users 
SET assigned_seasons = '["season-id-1", "season-id-2", "season-id-3"]'::jsonb
WHERE id = 'sub-admin-id';
```

### Assign ALL Seasons
```sql
UPDATE users 
SET assigned_seasons = (SELECT jsonb_agg(id) FROM seasons)
WHERE id = 'sub-admin-id';
```

### Assign Active Season Only
```sql
UPDATE users 
SET assigned_seasons = (SELECT jsonb_agg(id) FROM seasons WHERE "isActive" = true)
WHERE id = 'sub-admin-id';
```

### Assign Active Season to ALL Sub-Admins
```sql
UPDATE users 
SET assigned_seasons = (SELECT jsonb_agg(id) FROM seasons WHERE "isActive" = true)
WHERE role = 'SUB_ADMIN';
```

## Troubleshooting

### Check if assignment worked
```sql
SELECT id, name, email, assigned_seasons 
FROM users 
WHERE role = 'SUB_ADMIN';
```

### Check what seasons exist
```sql
SELECT id, name, "isActive" FROM seasons;
```

### Clear all assignments (start over)
```sql
UPDATE users 
SET assigned_seasons = '[]'::jsonb
WHERE role = 'SUB_ADMIN';
```

## Quick Scripts Available
- `scripts/quick-assign-season.sql` - Interactive guide
- `scripts/assign-season-now.sql` - Template to fill in
- `scripts/assign-seasons-to-sub-admins.sql` - Full reference with examples
