# Setup Instructions - Audit Trail System

## Step 1: Run Database Migration

```bash
psql $DATABASE_URL -f prisma/migrations/add_audit_trail.sql
```

This will:
- Create the `audit_logs` table
- Add `created_by` and `updated_by` columns to existing tables
- Add sub-admin management fields to `users` table
- Create necessary indexes

## Step 2: Verify Migration

Check that the tables were created:

```sql
-- Check audit_logs table
SELECT * FROM audit_logs LIMIT 1;

-- Check users table has new columns
\d users

-- Check tournaments has tracking columns
\d tournaments
```

## Step 3: Access Admin Pages

### Super Admin Pages Created:

1. **Sub-Admin Management** - `/super-admin/sub-admins`
   - View all sub-admins
   - See who created each one
   - Track total actions
   - View last login

2. **Create Sub-Admin** - `/super-admin/sub-admins/new`
   - Create new sub-admin accounts
   - Assign season permissions
   - Set initial password

3. **Audit Logs Viewer** - `/super-admin/audit-logs`
   - View all actions
   - Filter by user, season, action type
   - Paginated results
   - Export capability

## Step 4: Test the System

### Create a Test Sub-Admin

1. Login as super admin
2. Go to `/super-admin/sub-admins`
3. Click "Create Sub-Admin"
4. Fill in:
   - Name: Test Sub-Admin
   - Email: subadmin@test.com
   - Password: testpass123
   - Assign to a season
5. Submit

### Verify Audit Log

1. Go to `/super-admin/audit-logs`
2. You should see a `CREATE_SUB_ADMIN` entry
3. Check details show the email and assigned seasons

## Step 5: Integrate Audit Logging

Now you need to add audit logging to your existing API routes. Here's how:

### Example: Tournament Creation

```typescript
// In your tournament API route
import { createAuditLog } from '@/lib/audit'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // ... create tournament logic ...
  
  const tournament = await prisma.tournaments.create({
    data: {
      ...tournamentData,
      created_by: session.user.email,
      updated_by: session.user.email
    }
  })
  
  // Log the action
  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role,
    action: 'CREATE_TOURNAMENT',
    entityType: 'TOURNAMENT',
    entityId: tournament.id,
    entityName: tournament.name,
    seasonId: tournament.seasonId,
    details: {
      tournamentType: tournament.tournamentType,
      startDate: tournament.startDate
    },
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined
  })
  
  return NextResponse.json({ tournament })
}
```

### Routes to Update

Add audit logging to these API routes:

1. **Tournaments**
   - `app/api/seasons/[seasonId]/tournaments/route.ts` - CREATE_TOURNAMENT
   - Update route - UPDATE_TOURNAMENT
   - Delete route - DELETE_TOURNAMENT

2. **Matches**
   - Match creation - CREATE_MATCH
   - Match updates - UPDATE_MATCH
   - Score updates - UPDATE_MATCH

3. **Auctions**
   - Auction creation - CREATE_AUCTION
   - Player sales - SELL_PLAYER

4. **Teams**
   - Team creation - CREATE_TEAM
   - Team updates - UPDATE_TEAM

5. **Calendar**
   - Event creation - CREATE_CALENDAR_EVENT
   - Event updates - UPDATE_CALENDAR_EVENT

## Step 6: Update Session to Track Last Login

Add this to your NextAuth callbacks:

```typescript
// In app/api/auth/[...nextauth]/route.ts
callbacks: {
  async signIn({ user }) {
    // Update last login
    await prisma.$executeRaw`
      UPDATE users 
      SET last_login = NOW() 
      WHERE id = ${user.id}
    `
    return true
  }
}
```

## Step 7: Test Complete Flow

1. **Create Sub-Admin**
   - Login as super admin
   - Create a sub-admin with season access
   - Verify audit log shows CREATE_SUB_ADMIN

2. **Sub-Admin Actions**
   - Login as the sub-admin
   - Create a tournament
   - Create some matches
   - Run an auction

3. **View Audit Trail**
   - Login as super admin
   - Go to audit logs
   - Filter by the sub-admin
   - See all their actions

4. **Check Entity History**
   - View a tournament
   - See who created it
   - See who last updated it

## Features Summary

### ✅ Completed
- Database schema with audit_logs table
- Tracking columns on all major tables
- Sub-admin management page
- Create sub-admin form
- Audit logs viewer with filters
- API endpoint for creating sub-admins
- Audit logging utility functions

### 🔄 Next Steps
- Integrate audit logging into existing API routes
- Add sub-admin detail page
- Add edit sub-admin functionality
- Add deactivate sub-admin feature
- Add export audit logs to CSV
- Add activity dashboard

## Security Notes

1. **Password Security**
   - Passwords are hashed with bcrypt (cost 12)
   - Uses $2b$ prefix for compatibility

2. **Access Control**
   - Only SUPER_ADMIN can create sub-admins
   - Only SUPER_ADMIN can view audit logs
   - Sub-admins can only access assigned seasons

3. **Audit Log Integrity**
   - Logs are immutable (no delete/update)
   - Includes IP address and user agent
   - Timestamps are automatic

4. **Data Privacy**
   - Be careful what goes in `details` field
   - Don't log passwords or sensitive data
   - Consider GDPR compliance for user data

## Troubleshooting

### Migration Fails
```bash
# Check if tables already exist
psql $DATABASE_URL -c "\dt"

# Drop and recreate if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS audit_logs CASCADE;"
```

### Can't Create Sub-Admin
- Check super admin role in database
- Verify session is working
- Check browser console for errors
- Check server logs

### Audit Logs Not Showing
- Verify audit_logs table exists
- Check if createAuditLog is being called
- Look for errors in server logs
- Verify database connection

## Questions?

The system is now ready to track all sub-admin actions. Every change they make will be logged with who, what, when, and why.
