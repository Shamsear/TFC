# Audit Trail System - Quick Start Guide

## 🚀 Getting Started

### Step 1: Run Database Migration

```bash
# Connect to your database and run the migration
psql $DATABASE_URL -f prisma/migrations/add_audit_trail.sql
```

This creates:
- `audit_logs` table for tracking all actions
- Adds `created_by` and `updated_by` columns to all major tables

### Step 2: Create Your First Sub-Admin

1. Login as SUPER_ADMIN
2. Navigate to `/super-admin/sub-admins`
3. Click "Create New Sub-Admin"
4. Fill in the form:
   - Name
   - Email
   - Password
   - Assign seasons they can manage
5. Click "Create Sub-Admin"

### Step 3: Test Audit Logging

1. Logout and login as the sub-admin you just created
2. Perform some actions:
   - Create a tournament
   - Sell a player in auction
   - Update a match score
   - Create a calendar event
3. Logout and login back as SUPER_ADMIN
4. Navigate to `/super-admin/sub-admins/[id]/audit`
5. View all actions performed by that sub-admin

## 📊 Viewing Audit Logs

### Via Admin UI

**View logs for a specific sub-admin:**
```
/super-admin/sub-admins/[id]/audit
```

Shows:
- All actions performed by that sub-admin
- Timestamp of each action
- Entity affected (tournament, match, player, etc.)
- Details of what changed
- IP address and user agent

### Via Database Query

**Get all actions by a user:**
```sql
SELECT * FROM audit_logs 
WHERE user_email = 'subadmin@example.com'
ORDER BY created_at DESC;
```

**Get all player sales:**
```sql
SELECT * FROM audit_logs 
WHERE action = 'SELL_PLAYER'
ORDER BY created_at DESC;
```

**Get actions in a specific season:**
```sql
SELECT * FROM audit_logs 
WHERE season_id = 'season-123'
ORDER BY created_at DESC;
```

**Get actions in the last 24 hours:**
```sql
SELECT * FROM audit_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## 🔍 What Gets Tracked?

### Tournament Actions
- ✅ Create tournament
- ✅ Create fixtures
- ✅ Reschedule fixtures
- ✅ Add gaps between fixtures
- ✅ Create knockout rounds
- ✅ Update knockout pairings

### Match Actions
- ✅ Update match scores
- ✅ Change match status
- ✅ Update match date/venue

### Auction Actions
- ✅ Sell player to team
- ✅ Player purchases

### Calendar Actions
- ✅ Create auction calendar
- ✅ Update calendar event
- ✅ Delete calendar event
- ✅ Bulk create calendars

### Team Actions
- ✅ Assign teams to season
- ✅ Create new team (super-admin)

### Season Actions
- ✅ Create new season (super-admin)

### Player Actions
- ✅ Retain players from previous season

### Admin Actions
- ✅ Create sub-admin (super-admin)
- ✅ Update sub-admin (super-admin)
- ✅ Deactivate sub-admin (super-admin)

## 📝 Audit Log Structure

Each audit log entry contains:

```typescript
{
  id: string                    // Unique log ID
  user_id: string              // Who performed the action
  user_email: string           // User's email
  user_role: string            // User's role (SUB_ADMIN, SUPER_ADMIN)
  action: string               // What action was performed
  entity_type: string          // What type of entity was affected
  entity_id: string            // ID of the affected entity
  entity_name: string          // Name of the affected entity
  season_id: string            // Season context (if applicable)
  details: JSON                // Action-specific details
  ip_address: string           // IP address of the user
  user_agent: string           // Browser/client information
  created_at: timestamp        // When the action occurred
}
```

## 🎯 Common Use Cases

### 1. Investigate Who Changed a Match Score

```sql
SELECT * FROM audit_logs 
WHERE action = 'UPDATE_MATCH' 
  AND entity_id = 'match-123'
ORDER BY created_at DESC;
```

### 2. See All Actions by a Sub-Admin Today

```sql
SELECT * FROM audit_logs 
WHERE user_id = 'user-456'
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### 3. Track All Player Sales in a Season

```sql
SELECT 
  user_email,
  entity_name as player_name,
  details->>'teamName' as team,
  details->>'soldPrice' as price,
  created_at
FROM audit_logs 
WHERE action = 'SELL_PLAYER'
  AND season_id = 'season-789'
ORDER BY created_at DESC;
```

### 4. Get Activity Summary by User

```sql
SELECT 
  user_email,
  action,
  COUNT(*) as count,
  MAX(created_at) as last_action
FROM audit_logs
GROUP BY user_email, action
ORDER BY count DESC;
```

### 5. Find Who Created a Tournament

```sql
SELECT 
  user_email,
  entity_name as tournament_name,
  details,
  created_at
FROM audit_logs 
WHERE action = 'CREATE_TOURNAMENT'
  AND entity_id = 'tournament-123';
```

## 🔐 Security Features

### Automatic Tracking
- Every API route automatically logs actions
- No manual intervention needed
- Cannot be bypassed by sub-admins

### Immutable Logs
- Audit logs cannot be modified or deleted
- Permanent record of all actions
- Tamper-proof accountability

### Detailed Context
- IP address captured for security
- User agent captured for device tracking
- Full details of what changed

### Role-Based Access
- Only SUPER_ADMIN can view audit logs
- Sub-admins cannot see their own logs
- Complete transparency for administrators

## 📈 Monitoring & Reporting

### Daily Activity Report

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(DISTINCT user_id) as active_users
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Most Active Sub-Admins

```sql
SELECT 
  user_email,
  COUNT(*) as total_actions,
  MAX(created_at) as last_active
FROM audit_logs
WHERE user_role = 'SUB_ADMIN'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_email
ORDER BY total_actions DESC
LIMIT 10;
```

### Action Breakdown by Type

```sql
SELECT 
  action,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY action
ORDER BY count DESC;
```

## 🛠️ Troubleshooting

### Audit Logs Not Appearing?

1. **Check database migration ran:**
   ```sql
   SELECT * FROM audit_logs LIMIT 1;
   ```
   If error, run the migration.

2. **Check user session:**
   - Ensure `session.user.id` exists
   - Ensure `session.user.email` exists
   - Ensure `session.user.role` exists

3. **Check API route:**
   - Verify `createAuditLog()` is called after successful operation
   - Check for any errors in server logs

### Can't View Audit Logs?

1. **Check role:**
   - Only SUPER_ADMIN can view audit logs
   - Sub-admins cannot access audit log pages

2. **Check navigation:**
   - Navigate to `/super-admin/sub-admins/[id]/audit`
   - Replace `[id]` with actual sub-admin user ID

## 📚 Additional Resources

- **Full Documentation**: See `AUDIT-TRAIL-SYSTEM.md`
- **Implementation Details**: See `IMPLEMENTATION-CHECKLIST.md`
- **Completion Summary**: See `AUDIT-LOGGING-COMPLETE.md`
- **Audit Utilities**: See `lib/audit.ts`

## 🎉 You're All Set!

The audit trail system is now fully operational. Every action performed by sub-admins is automatically tracked and can be reviewed by super-admins at any time.

**Key Benefits:**
- ✅ Complete accountability
- ✅ Security and compliance
- ✅ Easy troubleshooting
- ✅ Activity monitoring
- ✅ Tamper-proof records

---

**Need Help?** Check the documentation files or review the audit log viewer at `/super-admin/sub-admins/[id]/audit`
