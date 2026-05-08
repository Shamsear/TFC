# Audit Trail System - Sub-Admin Accountability

## Overview
This system ensures complete accountability for all sub-admin actions by tracking who did what, when, and in which context.

## Key Features

### 1. Sub-Admin Creation by Super Admin Only
- Only SUPER_ADMIN can create SUB_ADMIN accounts
- Each sub-admin is linked to the super admin who created them
- Sub-admins cannot self-register

### 2. Comprehensive Action Tracking
Every action performed by a sub-admin is logged with:
- **Who**: User ID, email, and role
- **What**: Action type and entity affected
- **When**: Timestamp
- **Where**: Season context (if applicable)
- **How**: IP address and user agent
- **Details**: Additional context (JSON)

### 3. Tracked Actions
```typescript
- CREATE_TOURNAMENT
- UPDATE_TOURNAMENT
- DELETE_TOURNAMENT
- CREATE_MATCH
- UPDATE_MATCH
- DELETE_MATCH
- CREATE_AUCTION
- UPDATE_AUCTION
- DELETE_AUCTION
- SELL_PLAYER
- CREATE_TEAM
- UPDATE_TEAM
- DELETE_TEAM
- CREATE_CALENDAR_EVENT
- UPDATE_CALENDAR_EVENT
- DELETE_CALENDAR_EVENT
- CREATE_SUB_ADMIN
- UPDATE_SUB_ADMIN
- DEACTIVATE_SUB_ADMIN
- LOGIN
- LOGOUT
```

## Database Schema

### New Tables

#### `audit_logs`
```sql
- id: Unique identifier
- user_id: Who performed the action
- user_email: Email for quick reference
- user_role: Role at time of action
- action: Type of action (enum)
- entity_type: What was affected (tournament, match, etc.)
- entity_id: ID of affected entity
- entity_name: Name for easy reading
- season_id: Season context
- details: JSON with additional info
- ip_address: Where action came from
- user_agent: Browser/client info
- created_at: When action occurred
```

### Modified Tables

#### `users`
```sql
- created_by: Super admin who created this sub-admin
- is_active: Can this sub-admin login?
- last_login: Track activity
- assigned_seasons: JSON array of season IDs they can manage
```

#### All Major Tables (tournaments, matches, etc.)
```sql
- created_by: Who created this record
- updated_by: Who last updated this record
```

## Implementation Guide

### 1. Run Migration
```bash
# Run the audit trail migration
psql $DATABASE_URL -f prisma/migrations/add_audit_trail.sql
```

### 2. Use Audit Logging in API Routes

```typescript
import { createAuditLog } from '@/lib/audit'
import { getServerSession } from 'next-auth'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  // Your business logic here
  const tournament = await prisma.tournaments.create({
    data: {
      ...tournamentData,
      created_by: session.user.id
    }
  })
  
  // Log the action
  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role,
    action: 'CREATE_TOURNAMENT',
    entityType: 'tournament',
    entityId: tournament.id,
    entityName: tournament.name,
    seasonId: tournament.seasonId,
    details: { tournamentType: tournament.tournamentType },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  })
  
  return Response.json({ success: true, tournament })
}
```

### 3. Update Existing API Routes

For each API route that modifies data:

1. Add `created_by` or `updated_by` to the database operation
2. Call `createAuditLog()` after successful operation
3. Include relevant context in the details field

Example for match update:
```typescript
// Update match
const match = await prisma.matches.update({
  where: { id: matchId },
  data: {
    ...updateData,
    updated_by: session.user.id,
    updatedAt: new Date()
  }
})

// Log the action
await createAuditLog({
  userId: session.user.id,
  userEmail: session.user.email,
  userRole: session.user.role,
  action: 'UPDATE_MATCH',
  entityType: 'match',
  entityId: match.id,
  entityName: `${match.homeTeam.team.name} vs ${match.awayTeam.team.name}`,
  seasonId: match.tournament.seasonId,
  details: { 
    changes: updateData,
    previousStatus: oldMatch.status,
    newStatus: match.status
  }
})
```

## Super Admin Pages

### Sub-Admin Management
- **URL**: `/super-admin/sub-admins`
- **Features**:
  - List all sub-admins
  - View stats (total, active, inactive, total actions)
  - Create new sub-admin
  - Edit sub-admin details
  - Deactivate/activate accounts
  - View individual audit logs

### Audit Log Viewer
- **URL**: `/super-admin/sub-admins/[id]/audit`
- **Features**:
  - Filter by date range
  - Filter by action type
  - Filter by entity type
  - Filter by season
  - Export to CSV
  - View detailed action information

## Security Considerations

1. **Audit logs are immutable** - Once created, they cannot be modified or deleted
2. **Separate from main data** - Audit logs are in their own table
3. **Indexed for performance** - Fast queries even with millions of logs
4. **IP tracking** - Helps identify suspicious activity
5. **Session validation** - All actions require valid session

## Reporting

### Available Reports

1. **Sub-Admin Activity Summary**
   - Actions per sub-admin
   - Most active sub-admins
   - Action types distribution

2. **Season Activity Report**
   - All actions in a specific season
   - Timeline of changes
   - Who made what changes

3. **Entity History**
   - Complete history of a tournament/match/etc.
   - Who created it
   - All modifications
   - Who made each change

## Best Practices

1. **Always log actions** - Even failed attempts
2. **Include context** - Add relevant details to help understand the action
3. **Use descriptive entity names** - Makes logs readable
4. **Log before and after states** - Helps understand what changed
5. **Regular audits** - Review logs periodically for unusual activity

## Example Queries

### Get all actions by a sub-admin
```typescript
const logs = await getAuditLogs({
  userId: 'user-123',
  limit: 100
})
```

### Get all tournament creations in a season
```typescript
const logs = await getAuditLogs({
  seasonId: 'season-001',
  action: 'CREATE_TOURNAMENT'
})
```

### Get activity summary for a user
```typescript
const summary = await getUserAuditSummary('user-123', 'season-001')
// Returns: { action, entity_type, count, last_action }
```

## Next Steps

1. Run the migration SQL file
2. Update all API routes to include audit logging
3. Create the sub-admin management pages
4. Create the audit log viewer page
5. Test the system thoroughly
6. Train super admins on using the audit features

## Maintenance

- Audit logs should be archived periodically (e.g., after each season)
- Consider data retention policies
- Monitor log table size
- Regular backups of audit data
