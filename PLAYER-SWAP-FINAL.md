# Player Swap System - Final Implementation

## Summary
Implemented a player swap system where teams exchange equal numbers of players, and each player takes on their counterpart's value. No budget changes occur.

## Core Concept

### Value Exchange
When players are swapped:
- Player A from Team 1 → Team 2, takes Player B's value
- Player B from Team 2 → Team 1, takes Player A's value
- Budgets remain unchanged
- Squad sizes remain the same

### Example
```
Before Swap:
- Team A: Player X (£60)
- Team B: Player Y (£40)

After Swap:
- Team A: Player Y (£60) ← took Player X's value
- Team B: Player X (£40) ← took Player Y's value

Budget Changes: None
```

## Rules

### Must Be Even
- ✅ 1-for-1 swap allowed
- ✅ 2-for-2 swap allowed
- ✅ 3-for-3 swap allowed
- ✅ N-for-N swap allowed
- ❌ 1-for-2 swap NOT allowed
- ❌ 2-for-3 swap NOT allowed
- ❌ Any uneven swap NOT allowed

### Value Pairing
In multi-player swaps, players are paired by index:
```
Team A: [Player1 (£50), Player2 (£40), Player3 (£30)]
Team B: [PlayerA (£60), PlayerB (£35), PlayerC (£25)]

After Swap:
- Player1 → Team B with £60 (took PlayerA's value)
- Player2 → Team B with £35 (took PlayerB's value)
- Player3 → Team B with £25 (took PlayerC's value)
- PlayerA → Team A with £50 (took Player1's value)
- PlayerB → Team A with £40 (took Player2's value)
- PlayerC → Team A with £30 (took Player3's value)
```

## API Implementation

### Endpoint
`POST /api/admin/players/swap`

### Request
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    {
      "team1Id": "team-1",
      "team2Id": "team-2",
      "team1PlayerIds": ["player-1", "player-2"],
      "team2PlayerIds": ["player-3", "player-4"],
      "notes": "Optional description"
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "swapped": 1,
  "errors": 0,
  "details": {
    "successfulSwaps": [
      {
        "swapType": "Double",
        "team1": {
          "id": "team-1",
          "name": "Team A",
          "playersOut": "Player 1, Player 2",
          "playersIn": "Player 3, Player 4"
        },
        "team2": {
          "id": "team-2",
          "name": "Team B",
          "playersOut": "Player 3, Player 4",
          "playersIn": "Player 1, Player 2"
        },
        "valueSwaps": [
          {
            "team1Player": "Player 1",
            "team1OldValue": 50,
            "team1NewValue": 60,
            "team2Player": "Player 3",
            "team2OldValue": 60,
            "team2NewValue": 50
          },
          {
            "team1Player": "Player 2",
            "team1OldValue": 40,
            "team1NewValue": 35,
            "team2Player": "Player 4",
            "team2OldValue": 35,
            "team2NewValue": 40
          }
        ]
      }
    ],
    "errors": []
  }
}
```

## Database Changes

### Transfer History
1. Old transfers marked as `SWAPPED_OUT`
2. New transfers created with `ACTIVE` status
3. New transfers use counterpart's value
4. `acquisitionType` = `'player_swap'`
5. `releasedAt` timestamp set
6. `releaseNotes` contains swap description

### Financial Ledger
- Entries created for both teams
- Amount: £0 (no budget change)
- Transaction type: `ADJUSTMENT`
- Description includes all player names
- Used for audit trail only

### Budgets
- No changes to team budgets
- Squad sizes remain the same
- Total league value unchanged

## Validation

### Pre-Swap Checks
1. Both teams exist in season
2. All players exist
3. All players are ACTIVE with their specified teams
4. Same number of players from each team
5. Teams are different (can't swap within same team)
6. At least 1 player from each team

### Error Messages
- "Uneven swap not allowed. Team 1 has X player(s), Team 2 has Y player(s). Must be equal."
- "Cannot swap players within the same team"
- "Player {name} not in {team}"
- "One or both teams not found in season"

## Benefits

### Simplicity
- No complex budget calculations
- No value negotiations
- Clear value exchange

### Fairness
- Equal number of players exchanged
- No team gains budget advantage
- Transparent value swapping

### Integrity
- Total league budget unchanged
- No money created or destroyed
- Complete audit trail

### Flexibility
- Any number of players (as long as even)
- Works for any value combinations
- Custom notes for context

## Use Cases

### Scenario 1: Position Swap
Team A needs a striker, Team B needs a defender
- Team A: Defender (£50) → Team B
- Team B: Striker (£60) → Team A
- Defender now worth £60 in Team B
- Striker now worth £50 in Team A

### Scenario 2: Squad Refresh
Both teams want to refresh their squads
- Team A: 3 players (£150 total) → Team B
- Team B: 3 players (£180 total) → Team A
- Each player takes their counterpart's value
- No budget changes

### Scenario 3: Strategic Trade
Teams optimize their squad composition
- Team A: 2 midfielders → Team B
- Team B: 2 forwards → Team A
- Values swap between counterparts
- Both teams get desired positions

## Migration Notes

### Status Enum
- Uses `SWAPPED_OUT` (not `TRANSFERRED_OUT`)
- Reflects swap-based system
- Clear historical record

### Backward Compatibility
- Old transfer API still available (deprecated)
- Old transfers can be marked as `SWAPPED_OUT`
- Existing ACTIVE transfers unaffected

## Files

- `app/api/admin/players/swap/route.ts` - Swap API
- `PLAYER-SWAP-SYSTEM.md` - Full documentation
- `TRANSFER-STATUS-UPDATE-SWAPPED.md` - Status enum update
- `scripts/add-transfer-status-column.sql` - Migration script
- `prisma/schema.prisma` - Schema with SWAPPED_OUT enum

## Testing

### Manual Testing
1. Create single swap (1-for-1)
2. Verify values exchanged
3. Verify no budget changes
4. Check transfer_history status
5. Verify financial ledger entries

### Edge Cases
- Swap with same values
- Swap with very different values
- Multiple swaps in one request
- Invalid player IDs
- Uneven player counts (should fail)

## Next Steps

1. ✅ API implemented
2. ✅ Documentation complete
3. ✅ Status enum updated
4. ⏳ Run database migration
5. ⏳ Create UI for swap tool
6. ⏳ Test with real data
7. ⏳ Deploy to production
