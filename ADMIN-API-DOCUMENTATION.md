# Admin API Documentation

These API routes provide backend functionality for admin tools. You can build your own UI to consume these APIs.

## Player Management APIs

### 1. Release Players
**Endpoint:** `POST /api/admin/players/release`

**Description:** Release players from teams and refund their purchase price.

**Auth Required:** SUB_ADMIN or SUPER_ADMIN

**Request Body:**
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "TFCP-123",
      "teamId": "TFCT-1",
      "notes": "Optional release reason"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "released": 1,
  "errors": 0,
  "details": {
    "successfulReleases": [
      {
        "playerId": "TFCP-123",
        "playerName": "Player Name",
        "teamId": "TFCT-1",
        "refundAmount": 1000
      }
    ],
    "errors": []
  }
}
```

**What it does:**
- Deletes the transfer record
- Refunds the purchase price to the team
- Creates a financial ledger entry (PLAYER_SALE)
- Supports bulk releases

---

### 2. Transfer Players (Free Transfer)
**Endpoint:** `POST /api/admin/players/transfer`

**Description:** Transfer players between teams for free (£0).

**Auth Required:** SUB_ADMIN or SUPER_ADMIN

**Request Body:**
```json
{
  "seasonId": "TFCS-4",
  "transfers": [
    {
      "playerId": "TFCP-123",
      "fromTeamId": "TFCT-1",
      "toTeamId": "TFCT-2",
      "notes": "Optional transfer reason"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "transferred": 1,
  "errors": 0,
  "details": {
    "successfulTransfers": [
      {
        "playerId": "TFCP-123",
        "playerName": "Player Name",
        "fromTeamId": "TFCT-1",
        "toTeamId": "TFCT-2",
        "refundAmount": 1000
      }
    ],
    "errors": []
  }
}
```

**What it does:**
- Deletes old transfer from source team
- Refunds original price to source team
- Creates new transfer to destination team at £0
- Creates financial ledger entries for both teams
- Supports bulk transfers

---

### 3. Get Team Players
**Endpoint:** `GET /api/admin/teams/players?seasonId=TFCS-4&teamId=TFCT-1`

**Description:** Get all players in a team with their stats.

**Auth Required:** SUB_ADMIN or SUPER_ADMIN

**Response:**
```json
{
  "players": [
    {
      "id": "TFCP-123",
      "name": "Player Name",
      "photoUrl": "https://...",
      "position": "CB",
      "positionGroup": "A",
      "overallRating": 85,
      "realWorldClub": "Real Madrid",
      "soldPrice": 1000,
      "acquisitionType": "auction"
    }
  ]
}
```

---

## Balance Management APIs

### 4. Audit Team Balances
**Endpoint:** `GET /api/admin/balances/audit?seasonId=TFCS-4`

**Description:** Check all team balances for discrepancies.

**Auth Required:** SUB_ADMIN or SUPER_ADMIN

**Response:**
```json
{
  "success": true,
  "seasonId": "TFCS-4",
  "totalTeams": 30,
  "teamsWithErrors": 1,
  "teamsWithoutErrors": 29,
  "totalDiscrepancy": 78,
  "audits": {
    "errors": [
      {
        "teamId": "TFCT-1",
        "teamName": "Manchester United",
        "currentBalance": 4513,
        "initialPurse": 10000,
        "totalSpent": 5409,
        "totalAdjustments": 0,
        "calculatedBalance": 4591,
        "difference": -78,
        "hasError": true,
        "transferCount": 15,
        "ledgerEntryCount": 16
      }
    ],
    "correct": [...]
  }
}
```

**What it does:**
- Calculates expected balance: `initialPurse - totalSpent + adjustments`
- Compares with current balance in database
- Returns teams with discrepancies

---

### 5. Fix Team Balance
**Endpoint:** `POST /api/admin/balances/fix`

**Description:** Manually correct a team's balance.

**Auth Required:** SUPER_ADMIN only

**Request Body:**
```json
{
  "seasonId": "TFCS-4",
  "teamId": "TFCT-1",
  "correctBalance": 4591,
  "reason": "Fixed ledger chain break"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Balance fixed successfully",
  "teamName": "Manchester United",
  "oldBalance": 4513,
  "newBalance": 4591,
  "adjustment": 78
}
```

**What it does:**
- Updates team balance to correct value
- Creates ADJUSTMENT ledger entry
- Records reason for audit trail

---

## Transfer Fix API

### 6. Fix Incorrect Allocations
**Endpoint:** `POST /api/admin/transfers/fix`

**Description:** Replace an incorrectly allocated player with the correct one (like Rafael Márquez case).

**Auth Required:** SUPER_ADMIN only

**Request Body:**
```json
{
  "seasonId": "TFCS-4",
  "teamId": "TFCT-1",
  "wrongPlayerId": "TFCP-79",
  "correctPlayerId": "TFCP-150",
  "reason": "Rafael Márquez (CB-B) was allocated from CB-A round"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer fixed successfully",
  "teamName": "Juventus",
  "removedPlayer": "Rafael Márquez",
  "addedPlayer": "Yuji Nakazawa",
  "price": 959,
  "roundNumber": 7,
  "positionGroup": "A"
}
```

**What it does:**
- Validates correct player is not already allocated
- Deletes wrong player's transfer
- Refunds original price
- Creates new transfer with correct player at same price
- Charges for new player
- Creates financial ledger entries for both transactions
- Maintains same round and price

---

## Usage Examples

### Example 1: Release Multiple Players
```javascript
const response = await fetch('/api/admin/players/release', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seasonId: 'TFCS-4',
    releases: [
      { playerId: 'TFCP-1', teamId: 'TFCT-1', notes: 'Poor performance' },
      { playerId: 'TFCP-2', teamId: 'TFCT-1', notes: 'Injury' }
    ]
  })
});
const data = await response.json();
console.log(`Released ${data.released} players`);
```

### Example 2: Transfer Player Between Teams
```javascript
const response = await fetch('/api/admin/players/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seasonId: 'TFCS-4',
    transfers: [
      {
        playerId: 'TFCP-123',
        fromTeamId: 'TFCT-1',
        toTeamId: 'TFCT-2',
        notes: 'Free transfer agreement'
      }
    ]
  })
});
```

### Example 3: Audit and Fix Balances
```javascript
// Step 1: Audit
const audit = await fetch('/api/admin/balances/audit?seasonId=TFCS-4');
const auditData = await audit.json();

// Step 2: Fix errors
for (const team of auditData.audits.errors) {
  await fetch('/api/admin/balances/fix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seasonId: 'TFCS-4',
      teamId: team.teamId,
      correctBalance: team.calculatedBalance,
      reason: `Auto-fix: Discrepancy of £${team.difference}`
    })
  });
}
```

### Example 4: Fix Wrong Player Allocation
```javascript
const response = await fetch('/api/admin/transfers/fix', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    seasonId: 'TFCS-4',
    teamId: 'TFCT-19',
    wrongPlayerId: 'TFCP-79',
    correctPlayerId: 'TFCP-150',
    reason: 'Wrong position group allocation'
  })
});
```

---

## Notes

1. **Authentication:** All endpoints require authentication. Use session-based auth (NextAuth).

2. **Transactions:** All operations use database transactions for data integrity.

3. **Financial Ledger:** Every balance change creates a ledger entry for audit trail.

4. **Bulk Operations:** Release and transfer endpoints support bulk operations.

5. **Error Handling:** APIs return detailed error information for failed operations in bulk requests.

6. **Authorization Levels:**
   - SUB_ADMIN: Can release, transfer, and audit
   - SUPER_ADMIN: Can do everything including balance fixes and transfer corrections

7. **Build Your Own UI:** These are backend APIs only. You can create admin pages using any UI framework or components you prefer.
