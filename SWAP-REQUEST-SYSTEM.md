# Swap Request System

## Overview
A system that allows teams to submit player swap requests for admin approval. Teams can propose even swaps (1-for-1, 2-for-2, 3-for-3, etc.) where players exchange values with their counterparts.

## Key Features

### Swap Mechanics
- **Even Swaps Only**: Must swap equal number of players (1-for-1, 2-for-2, etc.)
- **Value Exchange**: Players take on the value of their counterpart
  - Player A (£500K) swaps with Player B (£300K)
  - Player A now worth £300K in new team
  - Player B now worth £500K in new team
- **No Budget Changes**: Teams don't gain or lose money in swaps
- **Single Team Swaps**: All players from "other team" must be from same team

### Request Visibility
- **Requesting Team**: Can view and cancel their own requests
- **Target Team**: Can view requests they're involved in (cannot cancel)
- **Both Teams See**: All pending swap requests involving them

## Database Schema

### Tables

#### 1. `swap_requests`
Main swap request table.

**Columns:**
- `id` (VARCHAR 36, PK) - Unique request ID
- `season_id` (VARCHAR 36, FK) - Season reference
- `requesting_team_id` (VARCHAR 36, FK) - Team initiating the swap
- `target_team_id` (VARCHAR 36, FK) - Team receiving the request
- `status` (ENUM) - pending, approved, rejected
- `window_opened_at` (TIMESTAMP, nullable) - When window was opened
- `submitted_at` (TIMESTAMP) - When request was submitted
- `processed_at` (TIMESTAMP, nullable) - When admin processed it
- `processed_by` (VARCHAR 36, FK, nullable) - Admin who processed it
- `rejection_reason` (TEXT, nullable) - Reason if rejected
- `created_at` (TIMESTAMP) - Record creation time
- `updated_at` (TIMESTAMP) - Last update time

**Indexes:**
- `season_id`
- `requesting_team_id`
- `target_team_id`
- `status`
- `window_opened_at`

#### 2. `swap_request_players`
Players involved in the swap.

**Columns:**
- `id` (VARCHAR 36, PK) - Unique player entry ID
- `swap_request_id` (VARCHAR 36, FK) - Parent swap request
- `player_id` (VARCHAR 36, FK) - Player being swapped
- `player_name` (VARCHAR 255) - Player name (denormalized)
- `from_team_id` (VARCHAR 36, FK) - Current team
- `to_team_id` (VARCHAR 36, FK) - Destination team
- `player_value` (INTEGER) - Current value
- `created_at` (TIMESTAMP) - Record creation time

**Indexes:**
- `swap_request_id`
- `player_id`

### Season Settings

Added to `seasons` table:
- `swap_window_open` (BOOLEAN, default FALSE) - Controls if teams can submit swap requests

## Team Features

### 1. Swap Request Page (`/team/swap-request`)

**Access Control:**
- Only accessible when `swapWindowOpen = true`
- Shows "window closed" message when disabled

**Functionality:**
- **Two-Column Layout**:
  - Left: My team's players
  - Right: Available players from other teams
- **Filters**:
  - Team selector (filter other players by team)
  - Position filter
  - Playing style filter
  - Search bars for both columns
- **Selection**:
  - Multi-select from own team
  - Multi-select from other teams
  - Visual indicators for selected players
- **Validation**:
  - Must select equal numbers
  - All "other" players must be from same team
  - Real-time validation feedback
- **Summary**:
  - Shows selected players from both teams
  - Displays swap type (1-for-1, 2-for-2, etc.)
  - Shows player values
- **Submit**:
  - Creates swap request
  - Generates WhatsApp message
  - Copy to clipboard functionality
- **Manage Requests**:
  - View pending requests (own and received)
  - Cancel own pending requests
  - Cannot cancel after admin processes

**WhatsApp Format:**
```
🔄 *Swap Request*

*Team A* gives:
Player 1 (£500K)
Player 2 (£300K)

*Team B* gives:
Player 3 (£400K)
Player 4 (£400K)

*Type:* 2-for-2 swap
```

### 2. Request Visibility
- Teams see requests they initiated
- Teams see requests targeting them
- Both teams can view details
- Only requesting team can cancel

## Admin Features

### 1. Swap Requests Admin Page (`/sub-admin/[seasonId]/tools/swap-requests`)

**Window Control:**
- Toggle swap window open/closed
- Visual indicator of window status
- Confirmation before toggling

**Request Management:**
- View all requests (pending and processed)
- Filter by status
- See detailed swap information:
  - Both teams involved
  - All players in the swap
  - Player values
  - Swap type (1-for-1, 2-for-2, etc.)
  - Submission time
- Approve requests (performs actual swap)
- Reject requests (with reason)

**Statistics:**
- Pending count
- Approved count
- Rejected count

### 2. Approval Process
When admin approves a swap request:

1. **Validate**: Ensure even swap (equal player counts)
2. **For each player**:
   - Mark old `transfer_history` as `SWAPPED_OUT`
   - Find counterpart player (who's coming to this team)
   - Create new `transfer_history` with **counterpart's value**
3. **Update request**: Mark as approved, record processor
4. **All in transaction**: Rollback on any error

**Value Exchange Example:**
```
Team A gives: Player X (£500K)
Team B gives: Player Y (£300K)

After swap:
- Player X in Team B worth £300K (took Player Y's value)
- Player Y in Team A worth £500K (took Player X's value)
```

### 3. Rejection Process
When admin rejects a request:
1. Updates request status to 'rejected'
2. Records rejection reason
3. Records processor and timestamp
4. Both teams can see rejection reason

## API Endpoints

### Team APIs

#### POST `/api/team/swap-requests`
Submit a swap request.

**Request:**
```json
{
  "seasonId": "season-id",
  "requestingTeamId": "team-a-id",
  "targetTeamId": "team-b-id",
  "players": [
    {
      "playerId": "player-1-id",
      "playerName": "Player 1",
      "fromTeamId": "team-a-id",
      "toTeamId": "team-b-id",
      "playerValue": 500000
    },
    {
      "playerId": "player-2-id",
      "playerName": "Player 2",
      "fromTeamId": "team-b-id",
      "toTeamId": "team-a-id",
      "playerValue": 500000
    }
  ]
}
```

**Validation:**
- Even swap (equal player counts from each team)
- All players are ACTIVE
- Players belong to correct teams
- No duplicate pending requests between teams

**Response:**
```json
{
  "success": true,
  "request": {
    "id": "request-id",
    "requestingTeamId": "team-a-id",
    "requestingTeamName": "Team A",
    "targetTeamId": "team-b-id",
    "targetTeamName": "Team B",
    "isMyRequest": true,
    "submittedAt": "2024-01-01T00:00:00Z",
    "players": [...]
  }
}
```

#### GET `/api/team/swap-requests?seasonId=xxx`
Get team's swap requests (both as requester and target).

**Response:**
```json
{
  "requests": [
    {
      "id": "request-id",
      "requestingTeamId": "team-a-id",
      "requestingTeamName": "Team A",
      "targetTeamId": "team-b-id",
      "targetTeamName": "Team B",
      "status": "pending",
      "submittedAt": "2024-01-01T00:00:00Z",
      "players": [...]
    }
  ]
}
```

#### DELETE `/api/team/swap-requests/[id]`
Cancel a pending swap request (only requesting team).

**Response:**
```json
{
  "success": true
}
```

### Admin APIs

#### PATCH `/api/admin/seasons/[seasonId]/swap-window`
Toggle swap window.

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
  "swapWindowOpen": true
}
```

#### POST `/api/admin/swap-requests/[id]/approve`
Approve and execute a swap request.

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Updates transfer_history (marks old as SWAPPED_OUT)
- Creates new transfer_history entries with exchanged values
- Updates request status
- All in transaction

#### POST `/api/admin/swap-requests/[id]/reject`
Reject a swap request.

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
1. Admin opens swap window
2. Team navigates to `/team/swap-request`
3. Team selects players from own squad (left column)
4. Team filters and selects players from other teams (right column)
5. System validates even swap
6. Team reviews swap details
7. Team submits request
8. Team copies details to WhatsApp to notify other team/admin
9. Both teams can view the pending request
10. Only requesting team can cancel before approval
11. Team receives approval/rejection from admin

### Admin Workflow
1. Admin opens swap window via admin panel
2. Teams submit swap requests
3. Admin views all requests at `/sub-admin/[seasonId]/tools/swap-requests`
4. Admin reviews each request:
   - Teams involved
   - Players being swapped
   - Swap type (1-for-1, 2-for-2, etc.)
   - Player values
5. Admin approves or rejects:
   - **Approve:** Performs actual swap (updates DB, exchanges values)
   - **Reject:** Provides reason for rejection
6. Admin closes window when done

## Benefits

### For Teams
- Self-service swap proposals
- Clear visibility of swap details
- Easy WhatsApp sharing
- Can manage multiple requests
- Can cancel before approval
- See requests from other teams

### For Admins
- Reduced manual work
- Centralized request management
- Clear audit trail
- One-click approval
- Rejection reasons for transparency
- Automatic value exchange

## Security

### Access Control
- Teams can only submit for their own players
- Only requesting team can cancel
- Target team can view but not cancel
- Only admins can approve/reject
- Window control restricted to admins

### Data Integrity
- All approvals in transactions
- Validates player ownership
- Validates even swap
- Prevents duplicate requests
- Validates window status
- Validates request status before processing

## Value Exchange Logic

### How It Works
In a swap, players **exchange values** with their counterparts:

**Example 1: Simple 1-for-1**
```
Before:
- Team A has Player X (£500K)
- Team B has Player Y (£300K)

After Swap:
- Team A has Player Y (£500K) ← took Player X's value
- Team B has Player X (£300K) ← took Player Y's value
```

**Example 2: 2-for-2 Swap**
```
Before:
- Team A has Player A1 (£500K), Player A2 (£400K)
- Team B has Player B1 (£300K), Player B2 (£600K)

After Swap:
- Team A has Player B1 (£500K), Player B2 (£400K)
- Team B has Player A1 (£300K), Player A2 (£600K)

Each player takes the value of their counterpart
```

### Implementation
- Old transfer marked as `SWAPPED_OUT`
- New transfer created with counterpart's `soldPrice`
- No budget changes to teams
- Maintains financial balance

## Migration

### SQL Script
Already included in `scripts/add-request-tables.sql`:
- Creates `swap_requests` table
- Creates `swap_request_players` table
- Adds `swap_window_open` to seasons
- Creates indexes

### Prisma Schema
Already updated with:
- `swap_requests` model
- `swap_request_players` model
- `RequestStatus` enum
- Relations to seasons, teams, players, users
- Window control field on seasons

## Files Created

### Pages
- `app/(team)/team/swap-request/page.tsx` - Team request page
- `app/(admin)/sub-admin/[seasonId]/tools/swap-requests/page.tsx` - Admin management page

### Components
- `components/team/SwapRequestClient.tsx` - Team request interface (two-column layout)
- `components/admin/SwapRequestsAdminClient.tsx` - Admin management interface

### APIs
- `app/api/team/swap-requests/route.ts` - Team CRUD operations
- `app/api/team/swap-requests/[id]/route.ts` - Cancel request
- `app/api/admin/seasons/[seasonId]/swap-window/route.ts` - Window control
- `app/api/admin/swap-requests/[id]/approve/route.ts` - Approve and execute swap
- `app/api/admin/swap-requests/[id]/reject/route.ts` - Reject request

### Documentation
- `SWAP-REQUEST-SYSTEM.md` - This file

## Testing Checklist

### Team Testing
- [ ] Can access page when window open
- [ ] Cannot access when window closed
- [ ] Can select players from own team
- [ ] Can select players from other teams
- [ ] Team filter works
- [ ] Position filter works
- [ ] Playing style filter works
- [ ] Search works for both columns
- [ ] Validation prevents uneven swaps
- [ ] Validation prevents mixed teams
- [ ] Can submit valid swap
- [ ] WhatsApp copy works
- [ ] Can view own pending requests
- [ ] Can view received requests
- [ ] Can cancel own pending requests
- [ ] Cannot cancel received requests
- [ ] Cannot cancel processed requests

### Admin Testing
- [ ] Can toggle window open/closed
- [ ] Can view all requests
- [ ] Can see request details
- [ ] Can see both teams involved
- [ ] Can see all players in swap
- [ ] Can approve request
- [ ] Approval updates transfer_history correctly
- [ ] Approval exchanges values correctly
- [ ] Approval marks old transfers as SWAPPED_OUT
- [ ] Can reject request with reason
- [ ] Rejection reason visible to teams
- [ ] Statistics accurate
- [ ] Cannot process same request twice

### Integration Testing
- [ ] Multiple teams can submit
- [ ] Requests don't interfere
- [ ] Transaction rollback on error
- [ ] Concurrent approvals handled
- [ ] Window toggle affects all teams
- [ ] Both teams see pending requests
- [ ] Value exchange works correctly
- [ ] No budget changes occur

## Comparison with Release System

| Feature | Release System | Swap System |
|---------|---------------|-------------|
| **Purpose** | Remove players, get refund | Exchange players between teams |
| **Budget Impact** | Team gets refund | No budget changes |
| **Player Count** | Any number | Must be even (1-for-1, 2-for-2, etc.) |
| **Teams Involved** | One team | Two teams |
| **Visibility** | Only requesting team | Both teams see request |
| **Cancellation** | Requesting team only | Requesting team only |
| **Value Changes** | N/A | Players exchange values |
| **Ledger Entry** | REFUND transaction | No ledger entries |

## Future Enhancements

1. **Notifications**
   - Email to target team when request submitted
   - In-app notifications
   - WhatsApp API integration

2. **Bulk Operations**
   - Approve multiple swaps at once
   - Reject multiple with same reason

3. **Advanced Features**
   - Suggest fair swaps based on values
   - Swap history analytics
   - Most swapped positions
   - Team swap patterns

4. **Request Modifications**
   - Allow target team to counter-propose
   - Negotiation system
   - Add/remove players before approval

5. **Validation Enhancements**
   - Position balance checks
   - Squad size validation
   - Value fairness warnings

## Related Systems

### Existing Systems Used
- Transfer history (status column)
- Season teams (no budget changes)
- Authentication (team ownership)

### Integration Points
- Release request system (similar structure)
- Notification system (future)
- Analytics dashboard (future)
- Audit log system (future)
