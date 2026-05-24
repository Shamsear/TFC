# Player Release Process Documentation

## Overview
The player release feature allows admins to remove players from teams and refund their purchase price back to the team's budget. Released players are marked with `RELEASED` status in the transfer history for audit purposes.

## UI Location
**URL**: `/sub-admin/{seasonId}/tools/player-management`

## Features
1. **Swap Players** - Exchange players between teams (values swap)
2. **Release Players** - Remove players from teams and refund their cost

## API Endpoint

### POST `/api/admin/players/release`

**Authentication**: SUPER_ADMIN or SUB_ADMIN

**Request Body**:
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "player-id",
      "teamId": "team-id",
      "notes": "Optional release reason"
    }
  ]
}
```

## Release Types

### Single Release
Release one player from a team:
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "player-1",
      "teamId": "team-1",
      "notes": "Poor performance"
    }
  ]
}
```

### Bulk Release from One Team
Release multiple players from the same team:
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "player-1",
      "teamId": "team-1",
      "notes": "Squad restructuring"
    },
    {
      "playerId": "player-2",
      "teamId": "team-1",
      "notes": "Squad restructuring"
    },
    {
      "playerId": "player-3",
      "teamId": "team-1",
      "notes": "Squad restructuring"
    }
  ]
}
```

### Bulk Release from Multiple Teams
Release players from different teams in one request:
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "player-1",
      "teamId": "team-1",
      "notes": "Released from Team A"
    },
    {
      "playerId": "player-2",
      "teamId": "team-2",
      "notes": "Released from Team B"
    },
    {
      "playerId": "player-3",
      "teamId": "team-3",
      "notes": "Released from Team C"
    },
    {
      "playerId": "player-4",
      "teamId": "team-1",
      "notes": "Another release from Team A"
    }
  ]
}
```

## How Player Release Works

### Frontend Flow
1. Admin selects a team from dropdown (or multiple teams)
2. System loads all players in selected team(s)
3. Admin selects one or more players to release
4. Admin optionally adds notes explaining the release
5. Admin clicks "Release X Player(s)" button
6. System processes all releases in one transaction
7. System shows results (successful releases and any errors)

### Backend Process (Database Changes)

When players are released, the following happens in a **database transaction**:

#### 1. Validation
```typescript
// Check player exists
const player = await tx.base_players.findUnique({
  where: { id: playerId },
  select: { id: true, name: true }
});

// Check player is currently with the team (ACTIVE status)
const existingTransfer = await tx.transfer_history.findFirst({
  where: {
    basePlayerId: playerId,
    seasonId: seasonId,
    teamId: teamId,
    status: 'ACTIVE'
  }
});
```

#### 2. Mark Transfer as RELEASED
```typescript
// Mark transfer as RELEASED (don't delete)
await tx.transfer_history.update({
  where: { id: existingTransfer.id },
  data: {
    status: 'RELEASED',
    released_at: new Date(),
    release_notes: notes || `Player released: ${player.name}`
  }
});
```

#### 3. Update Team Budget
```typescript
// Get current team budget
const seasonTeam = await tx.season_teams.findUnique({
  where: {
    seasonId_teamId: { seasonId, teamId }
  }
});

// Refund player's purchase price
const transferPrice = existingTransfer.soldPrice;
const newBudget = seasonTeam.currentBudget + transferPrice;

await tx.season_teams.update({
  where: { id: seasonTeam.id },
  data: { currentBudget: newBudget }
});
```

#### 4. Create Financial Ledger Entry
```typescript
// Record the refund in financial ledger
const ledgerId = await generateFinancialId();
await tx.financial_ledger.create({
  data: {
    id: ledgerId,
    seasonTeamId: seasonTeam.id,
    seasonId: seasonId,
    transactionType: 'PLAYER_SALE',
    amount: transferPrice,
    previousBalance: seasonTeam.currentBudget,
    newBalance: newBudget,
    description: notes || `Player released: ${player.name}`,
    playerName: player.name
  }
});
```

## Database Tables Affected

### 1. `transfer_history`
**Action**: UPDATE (not DELETE)
- Sets `status` to `'RELEASED'`
- Sets `released_at` to current timestamp
- Sets `release_notes` to admin's notes

**Before**:
```
id: "TRF-123"
basePlayerId: "player-1"
seasonId: "TFCS-4"
teamId: "team-1"
soldPrice: 50
status: "ACTIVE"
released_at: null
release_notes: null
```

**After**:
```
id: "TRF-123"
basePlayerId: "player-1"
seasonId: "TFCS-4"
teamId: "team-1"
soldPrice: 50
status: "RELEASED"
released_at: "2024-01-15T10:30:00Z"
release_notes: "Poor performance"
```

### 2. `season_teams`
**Action**: UPDATE
- Increases `currentBudget` by player's `soldPrice`

**Before**:
```
id: "ST-456"
seasonId: "TFCS-4"
teamId: "team-1"
currentBudget: 100
```

**After** (if player cost £50):
```
id: "ST-456"
seasonId: "TFCS-4"
teamId: "team-1"
currentBudget: 150  // +50 refund
```

### 3. `financial_ledger`
**Action**: INSERT
- Creates new ledger entry recording the refund

**New Record**:
```
id: "FIN-789"
seasonTeamId: "ST-456"
seasonId: "TFCS-4"
transactionType: "PLAYER_SALE"
amount: 50
previousBalance: 100
newBalance: 150
description: "Player released: John Doe"
playerName: "John Doe"
createdAt: "2024-01-15T10:30:00Z"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "released": 3,
  "errors": 0,
  "details": {
    "successfulReleases": [
      {
        "playerId": "player-1",
        "playerName": "John Doe",
        "teamId": "team-1",
        "refundAmount": 50
      },
      {
        "playerId": "player-2",
        "playerName": "Jane Smith",
        "teamId": "team-2",
        "refundAmount": 60
      },
      {
        "playerId": "player-3",
        "playerName": "Bob Johnson",
        "teamId": "team-1",
        "refundAmount": 40
      }
    ],
    "errors": []
  }
}
```

### Partial Success Response
```json
{
  "success": true,
  "released": 2,
  "errors": 1,
  "details": {
    "successfulReleases": [
      {
        "playerId": "player-1",
        "playerName": "John Doe",
        "teamId": "team-1",
        "refundAmount": 50
      },
      {
        "playerId": "player-2",
        "playerName": "Jane Smith",
        "teamId": "team-2",
        "refundAmount": 60
      }
    ],
    "errors": [
      {
        "playerId": "player-3",
        "playerName": "Bob Johnson",
        "error": "Player not in team"
      }
    ]
  }
}
```

## Key Differences from Transfer/Swap

### Release
- Player leaves team completely
- No new team assignment
- Budget refunded to original team
- Status: `RELEASED`
- Player becomes free agent

### Swap
- Player moves to another team
- Another player comes in exchange
- Values swap between players
- No budget changes
- Status: Old transfer `SWAPPED_OUT`, new transfer `ACTIVE`

## Benefits of Status-Based System

### Historical Record
- All releases tracked permanently
- Can see when and why players were released
- Audit trail for compliance

### Data Integrity
- No data loss from deletions
- Complete history of player movements
- Can analyze release patterns

### Reversibility
- Could potentially "un-release" a player if needed
- Change status back to ACTIVE
- Adjust budget accordingly

## Validation Rules

### Pre-Release Checks
- ✅ Player must exist
- ✅ Player must be ACTIVE with specified team
- ✅ Team must exist in season
- ✅ User must be SUPER_ADMIN or SUB_ADMIN

### Error Handling
- Individual release failures don't stop other releases
- All successful releases committed together
- Errors returned with details for failed releases

## Use Cases

### Scenario 1: Single Player Release
Team wants to release one underperforming player:
- Select player
- Add notes: "Consistent poor performance"
- Release
- Team gets refund of player's purchase price

### Scenario 2: Squad Restructuring
Team wants to release multiple players:
- Select 3-5 players
- Add notes: "End of season squad restructuring"
- Release all at once
- Team gets total refund for all players

### Scenario 3: Multi-Team Release
Admin needs to release players from multiple teams:
- Build array with players from different teams
- Each release can have different notes
- Process all in one transaction
- Each team gets appropriate refunds

## Testing Checklist

- [ ] Release single player
- [ ] Release multiple players from one team
- [ ] Release players from multiple teams in one request
- [ ] Verify status changes to RELEASED
- [ ] Verify released_at timestamp is set
- [ ] Verify release_notes are saved
- [ ] Verify budget refund is correct
- [ ] Verify financial ledger entry created
- [ ] Verify squad size decreases
- [ ] Test with invalid player ID
- [ ] Test with player not in specified team
- [ ] Test with already released player
- [ ] Test partial success (some succeed, some fail)

## Related Files

- `app/api/admin/players/release/route.ts` - Release API
- `app/api/admin/players/swap/route.ts` - Swap API
- `scripts/add-transfer-status-column.sql` - Status column migration
- `PLAYER-SWAP-SYSTEM.md` - Swap documentation
- `TRANSFER-STATUS-MIGRATION-COMPLETE.md` - Migration guide
