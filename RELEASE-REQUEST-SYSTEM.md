# Release Request System

## Overview
A system that allows teams to submit player release requests for admin approval, reducing admin workload and providing transparency in the release process.

## Database Schema

### Tables Created

#### 1. `release_requests`
Stores player release requests from teams.

**Columns:**
- `id` (VARCHAR 36, PK) - Unique request ID
- `season_id` (VARCHAR 36, FK) - Season reference
- `team_id` (VARCHAR 36, FK) - Team making the request
- `player_id` (VARCHAR 36, FK) - Player to be released
- `player_name` (VARCHAR 255) - Player name (denormalized)
- `refund_amount` (INTEGER) - Amount to refund to team
- `notes` (TEXT, nullable) - Optional notes from team
- `status` (ENUM) - pending, approved, rejected
- `window_opened_at` (TIMESTAMP, nullable) - When the window was opened
- `submitted_at` (TIMESTAMP) - When request was submitted
- `processed_at` (TIMESTAMP, nullable) - When admin processed it
- `processed_by` (VARCHAR 36, FK, nullable) - Admin who processed it
- `rejection_reason` (TEXT, nullable) - Reason if rejected
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- `season_id`
- `team_id`
- `status`
- `window_opened_at`

### Season Settings

#### Added to `seasons` table:
- `release_window_open` (BOOLEAN, default FALSE) - Controls if teams can submit requests
- `swap_window_open` (BOOLEAN, default FALSE) - Controls if teams can submit swap requests

## Features

### Team Features

#### 1. Release Request Page (`/team/release-request`)

**Access Control:**
- Only accessible when `releaseWindowOpen = true`
- Shows "window closed" message when disabled

**Functionality:**
- View all active squad players
- Filter by:
  - Search (player name)
  - Position
  - Playing style
- Select multiple players for release
- See real-time calculations:
  - Total refund amount
  - Slots freed
  - New budget after release
- Submit release request
- View pending requests
- Cancel pending requests (before admin processes)
- Copy request details to WhatsApp

**WhatsApp Format:**
```
🔴 *Release Request - [Team Name]*

*Players:*
Player A (£500K)
Player B (£300K)

*Total Refund:* £0.80M
*Slots Freed:* 2
*New Budget:* £5.80M
```

#### 2. Request Management
- Teams can submit multiple requests
- All requests from same window are combined
- Can edit/cancel before admin approval
- Cannot modify after admin processes

### Admin Features

#### 1. Release Requests Admin Page (`/sub-admin/[seasonId]/tools/release-requests`)

**Window Control:**
- Toggle release window open/closed
- Visual indicator of window status
- Confirmation before toggling

**Request Management:**
- View all requests (pending and processed)
- Filter by status
- See request details:
  - Player info with photo
  - Team info
  - Refund amount
  - Submission time
  - Notes from team
- Approve requests (performs actual release)
- Reject requests (with reason)

**Statistics:**
- Pending count
- Approved count
- Rejected count

#### 2. Approval Process
When admin approves a request:
1. Updates `transfer_history` status to 'RELEASED'
2. Refunds team budget
3. Creates financial ledger entry
4. Updates request status to 'approved'
5. Records processor and timestamp

All operations in a single transaction for data integrity.

#### 3. Rejection Process
When admin rejects a request:
1. Updates request status to 'rejected'
2. Records rejection reason
3. Records processor and timestamp
4. Team can see rejection reason

## API Endpoints

### Team APIs

#### POST `/api/team/release-requests`
Submit release requests.

**Request:**
```json
{
  "seasonId": "season-id",
  "teamId": "team-id",
  "releases": [
    {
      "playerId": "player-id",
      "playerName": "Player Name",
      "refundAmount": 500000,
      "notes": "Optional notes"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "requests": [...]
}
```

#### GET `/api/team/release-requests?seasonId=xxx`
Get team's release requests.

**Response:**
```json
{
  "requests": [
    {
      "id": "request-id",
      "playerId": "player-id",
      "playerName": "Player Name",
      "refundAmount": 500000,
      "notes": "...",
      "status": "pending",
      "submittedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### DELETE `/api/team/release-requests/[id]`
Cancel a pending request.

**Response:**
```json
{
  "success": true
}
```

### Admin APIs

#### PATCH `/api/admin/seasons/[seasonId]/release-window`
Toggle release window.

**Request:**
```json
{
  "open": true
}
```

**Response:**
```json
{
  "success": true,
  "releaseWindowOpen": true
}
```

#### POST `/api/admin/release-requests/[id]/approve`
Approve a release request.

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Updates transfer_history status
- Refunds team budget
- Creates ledger entry
- Updates request status

#### POST `/api/admin/release-requests/[id]/reject`
Reject a release request.

**Request:**
```json
{
  "reason": "Reason for rejection"
}
```

**Response:**
```json
{
  "success": true
}
```

## Workflow

### Team Workflow
1. Admin opens release window
2. Team navigates to `/team/release-request`
3. Team filters and selects players
4. Team reviews refund and slot calculations
5. Team submits request
6. Team copies details to WhatsApp to notify admin
7. Team can view/cancel pending requests
8. Team receives approval/rejection from admin

### Admin Workflow
1. Admin opens release window via admin panel
2. Teams submit requests
3. Admin views all requests at `/sub-admin/[seasonId]/tools/release-requests`
4. Admin reviews each request:
   - Player details
   - Team details
   - Refund amount
   - Team notes
5. Admin approves or rejects:
   - **Approve:** Performs actual release (updates DB, refunds budget)
   - **Reject:** Provides reason for rejection
6. Admin closes window when done

## Benefits

### For Teams
- Self-service release requests
- Clear visibility of refund amounts
- Easy WhatsApp sharing
- Can manage multiple requests
- Can cancel before approval

### For Admins
- Reduced manual work
- Centralized request management
- Clear audit trail
- Batch processing capability
- Rejection reasons for transparency

## Security

### Access Control
- Teams can only submit for their own players
- Teams can only cancel their own requests
- Only admins can approve/reject
- Window control restricted to admins

### Data Integrity
- All approvals in transactions
- Validates player ownership
- Prevents duplicate requests
- Validates window status

## Migration

### SQL Script
Run `scripts/add-request-tables.sql` to create:
- `release_requests` table
- Add window control columns to `seasons`
- Create indexes

### Prisma Schema
Updated with:
- `release_requests` model
- `RequestStatus` enum
- Relations to seasons, teams, players, users
- Window control fields on seasons

## Future Enhancements

### Planned Features
1. **Swap Request System** (similar structure)
   - Teams request player swaps
   - Admin approval required
   - Even swaps only (1-for-1, 2-for-2, etc.)
   - Both teams see the request

2. **Bulk Operations**
   - Approve multiple requests at once
   - Reject multiple with same reason

3. **Notifications**
   - Email notifications to teams
   - In-app notifications
   - WhatsApp integration

4. **Request History**
   - View all historical requests
   - Export to CSV
   - Analytics dashboard

## Files Created

### Pages
- `app/(team)/team/release-request/page.tsx` - Team request page
- `app/(admin)/sub-admin/[seasonId]/tools/release-requests/page.tsx` - Admin management page

### Components
- `components/team/ReleaseRequestClient.tsx` - Team request interface
- `components/admin/ReleaseRequestsAdminClient.tsx` - Admin management interface

### APIs
- `app/api/team/release-requests/route.ts` - Team CRUD operations
- `app/api/team/release-requests/[id]/route.ts` - Cancel request
- `app/api/admin/seasons/[seasonId]/release-window/route.ts` - Window control
- `app/api/admin/release-requests/[id]/approve/route.ts` - Approve request
- `app/api/admin/release-requests/[id]/reject/route.ts` - Reject request

### Database
- `scripts/add-request-tables.sql` - Migration script
- `prisma/schema.prisma` - Updated schema

### Documentation
- `RELEASE-REQUEST-SYSTEM.md` - This file

## Testing Checklist

### Team Testing
- [ ] Can access page when window open
- [ ] Cannot access when window closed
- [ ] Can filter players by position
- [ ] Can filter players by playing style
- [ ] Can search players by name
- [ ] Can select multiple players
- [ ] Refund calculation correct
- [ ] Slots freed calculation correct
- [ ] Can submit request
- [ ] WhatsApp copy works
- [ ] Can view pending requests
- [ ] Can cancel pending requests
- [ ] Cannot cancel processed requests

### Admin Testing
- [ ] Can toggle window open/closed
- [ ] Can view all requests
- [ ] Can see request details
- [ ] Can approve request
- [ ] Approval updates transfer_history
- [ ] Approval refunds budget
- [ ] Approval creates ledger entry
- [ ] Can reject request with reason
- [ ] Rejection reason visible to team
- [ ] Statistics accurate
- [ ] Cannot process same request twice

### Integration Testing
- [ ] Multiple teams can submit
- [ ] Requests don't interfere
- [ ] Transaction rollback on error
- [ ] Concurrent approvals handled
- [ ] Window toggle affects all teams
