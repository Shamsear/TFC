# Audit Trail System - Implementation Checklist

## ✅ Completed

### Database & Core
- [x] Created audit trail migration SQL
- [x] Created audit logging utility (`lib/audit.ts`)
- [x] Created audit log table schema
- [x] Added tracking fields to all major tables

### Admin Pages
- [x] Sub-admin listing page (`/super-admin/sub-admins`)
- [x] Create sub-admin page (`/super-admin/sub-admins/new`)
- [x] Edit sub-admin page (`/super-admin/sub-admins/[id]/edit`)
- [x] Audit log viewer page (`/super-admin/sub-admins/[id]/audit`)

### Components
- [x] SubAdminForm component
- [x] AuditLogViewer component

### API Routes
- [x] POST `/api/super-admin/sub-admins` - Create sub-admin
- [x] PUT `/api/super-admin/sub-admins/[id]` - Update sub-admin
- [x] DELETE `/api/super-admin/sub-admins/[id]` - Deactivate sub-admin

## 🔄 Next Steps

### 1. Run Database Migration
```bash
# Connect to your database and run:
psql $DATABASE_URL -f prisma/migrations/add_audit_trail.sql

# Or if using a GUI tool, copy and paste the SQL from the file
```

### 2. ✅ Update Existing API Routes - COMPLETED

All API routes have been updated with audit logging:

#### Tournaments
- [x] `app/api/seasons/[seasonId]/tournaments/route.ts` - CREATE_TOURNAMENT
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/fixtures/route.ts` - CREATE_MATCH
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/fixtures/reschedule/route.ts` - UPDATE_MATCH
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/fixtures/add-gap/route.ts` - UPDATE_MATCH
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/knockout/route.ts` - CREATE_TOURNAMENT
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/knockout/pairings/[pairingId]/route.ts` - UPDATE_TOURNAMENT

#### Matches
- [x] `app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts` - UPDATE_MATCH

#### Auctions
- [x] `app/api/seasons/[seasonId]/auction/route.ts` - SELL_PLAYER
- [x] `app/api/seasons/[seasonId]/auction/sell/route.ts` - SELL_PLAYER

#### Calendar
- [x] `app/api/seasons/[seasonId]/calendar/route.ts` - CREATE_CALENDAR_EVENT
- [x] `app/api/seasons/[seasonId]/calendar/[calendarId]/route.ts` - UPDATE_CALENDAR_EVENT, DELETE_CALENDAR_EVENT
- [x] `app/api/seasons/[seasonId]/calendar/bulk/route.ts` - CREATE_CALENDAR_EVENT

#### Teams
- [x] `app/api/seasons/[seasonId]/teams/route.ts` - UPDATE_TEAM
- [x] `app/api/teams/route.ts` - CREATE_TEAM

#### Seasons
- [x] `app/api/seasons/route.ts` - CREATE_TEAM (season creation)

#### Retention
- [x] `app/api/seasons/[seasonId]/retention/route.ts` - CREATE_TEAM (player retention)

### 3. Update Auth to Track Login/Logout

In `app/api/auth/[...nextauth]/route.ts`:

```typescript
callbacks: {
  async signIn({ user }) {
    // Log login
    await createAuditLog({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      entityType: 'auth',
      ipAddress: '...', // Get from request
      userAgent: '...' // Get from request
    })
    return true
  }
}
```

### 4. Add Navigation Links

Update admin navigation to include:
- Link to `/super-admin/sub-admins` in super admin menu
- Show current user's audit log link in profile menu

### 5. Add Middleware for Session Validation

Create middleware to:
- Check if sub-admin is active before allowing access
- Check if sub-admin has access to the season they're trying to manage
- Update `last_login` timestamp

### 6. Testing Checklist

- [ ] Create a sub-admin account
- [ ] Login as sub-admin
- [ ] Perform various actions (create tournament, match, etc.)
- [ ] View audit logs as super admin
- [ ] Edit sub-admin permissions
- [ ] Deactivate sub-admin
- [ ] Verify deactivated sub-admin cannot login
- [ ] Check all audit logs are created correctly

### 7. Security Enhancements

- [ ] Add rate limiting to sub-admin creation
- [ ] Add email verification for new sub-admins
- [ ] Add password reset functionality
- [ ] Add 2FA option for sub-admins
- [ ] Add session timeout for inactive sub-admins

### 8. Reporting Features

Create additional pages for:
- [ ] Season activity report
- [ ] All sub-admins activity dashboard
- [ ] Export audit logs to CSV
- [ ] Real-time activity feed

## Example: Adding Audit Log to an API Route

```typescript
import { createAuditLog } from '@/lib/audit'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Your existing logic
  const tournament = await prisma.tournaments.create({
    data: {
      ...tournamentData,
      created_by: session.user.id, // Add this
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  // Add audit log
  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role,
    action: 'CREATE_TOURNAMENT',
    entityType: 'tournament',
    entityId: tournament.id,
    entityName: tournament.name,
    seasonId: tournament.seasonId,
    details: {
      tournamentType: tournament.tournamentType,
      startDate: tournament.startDate,
      endDate: tournament.endDate
    },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  })
  
  return Response.json({ success: true, tournament })
}
```

## Priority Order

1. **High Priority** (Do First)
   - Run database migration
   - Update tournament and match API routes
   - Test sub-admin creation and login

2. **Medium Priority** (Do Next)
   - Update auction and calendar API routes
   - Add navigation links
   - Add session validation middleware

3. **Low Priority** (Nice to Have)
   - Add reporting features
   - Add export functionality
   - Add email notifications

## Notes

- All audit logs are immutable - never delete or modify them
- Keep audit logs for at least 1 year for compliance
- Consider archiving old logs to a separate table
- Monitor audit log table size and performance
- Add indexes if queries become slow

## Support

If you encounter issues:
1. Check the AUDIT-TRAIL-SYSTEM.md documentation
2. Verify database migration ran successfully
3. Check that session includes user.id and user.role
4. Verify API routes have proper authentication
