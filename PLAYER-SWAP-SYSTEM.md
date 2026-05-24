# Player Swap System

## Overview
The player swap system allows teams to exchange players directly without releasing them. This replaces the previous "transfer" system where players moved from one team to another for free.

## Key Differences

### Old System (Transfer)
- Player moved from Team A to Team B
- Team A got refund of original price
- Team B got player for £0 (free)
- One-way movement

### New System (Swap)
- Teams exchange players directly
- Players swap values with each other
- No budget changes at all
- Two-way exchange (must be even: 1-for-1, 2-for-2, 3-for-3)

## Swap Types

### Single Swap (1-for-1)
- Team A gives 1 player to Team B
- Team B gives 1 player to Team A
- Players exchange values
- Example: 
  - Player X (£50) from Team A → Team B, becomes worth £30 (Player Y's value)
  - Player Y (£30) from Team B → Team A, becomes worth £50 (Player X's value)
  - No budget changes

### Double Swap (2-for-2)
- Team A gives 2 players to Team B
- Team B gives 2 players to Team A
- Each player takes the value of their counterpart
- Example:
  - Team A: Player X (£50) + Player Y (£40)
  - Team B: Player Z (£60) + Player W (£20)
  - After swap:
    - Player X → Team B with £60 value (Z's value)
    - Player Y → Team B with £20 value (W's value)
    - Player Z → Team A with £50 value (X's value)
    - Player W → Team A with £40 value (Y's value)
  - No budget changes

### Triple Swap (3-for-3)
- Team A gives 3 players to Team B
- Team B gives 3 players to Team A
- Each player takes the value of their counterpart
- No budget changes

### Important Rules
- ❌ **No uneven swaps** - Must be same number of players from each team
- ✅ **Value exchange** - Players swap values with their counterparts
- ✅ **No budget impact** - Budgets remain unchanged
- ✅ **Even numbers only** - 1-for-1, 2-for-2, 3-for-3, etc.

## API Endpoint

### POST `/api/admin/players/swap`

**Authentication**: SUPER_ADMIN or SUB_ADMIN

**Supports Bulk Operations**: ✅ Yes - Multiple swaps between different team pairs in one request

### Single Swap Request
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    {
      "team1Id": "team-1",
      "team2Id": "team-2",
      "team1PlayerIds": ["player-1"],
      "team2PlayerIds": ["player-2"],
      "notes": "Position swap"
    }
  ]
}
```

### Bulk Swap Request (Multiple Team Combinations)
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    {
      "team1Id": "team-A",
      "team2Id": "team-B",
      "team1PlayerIds": ["player-1", "player-2"],
      "team2PlayerIds": ["player-3", "player-4"],
      "notes": "Team A ↔ Team B swap"
    },
    {
      "team1Id": "team-C",
      "team2Id": "team-D",
      "team1PlayerIds": ["player-5"],
      "team2PlayerIds": ["player-6"],
      "notes": "Team C ↔ Team D swap"
    },
    {
      "team1Id": "team-E",
      "team2Id": "team-F",
      "team1PlayerIds": ["player-7", "player-8", "player-9"],
      "team2PlayerIds": ["player-10", "player-11", "player-12"],
      "notes": "Team E ↔ Team F triple swap"
    }
  ]
}
```

**Request Body**:
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    {
      "team1Id": "team-id-1",
      "team2Id": "team-id-2",
      "team1PlayerIds": ["player-1", "player-2"],
      "team2PlayerIds": ["player-3", "player-4"],
      "notes": "Optional swap description"
    }
  ]
}
```

**Response**:
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
          "id": "team-id-1",
          "name": "Team A",
          "playersOut": "Player 1, Player 2",
          "playersIn": "Player 3, Player 4"
        },
        "team2": {
          "id": "team-id-2",
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
            "team2NewValue": 30,
            "team2Player": "Player 4",
            "team2OldValue": 30,
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

### Transfer History Status
When a swap occurs:
1. Old transfers marked as `SWAPPED_OUT`
2. New transfers created with `status: 'ACTIVE'`
3. Players take on their counterpart's values
4. `acquisitionType` set to `'player_swap'`

### Value Exchange
- Player A from Team 1 gets Player B's value (from Team 2)
- Player B from Team 2 gets Player A's value (from Team 1)
- Values are swapped, not preserved
- No budget changes

### Financial Ledger
- Records created for both teams with £0 amount
- Transaction type: `ADJUSTMENT`
- Description includes all player names
- Tracks swap for audit purposes

## Example Scenarios

### Scenario 1: Single Swap
```
Team A: Player X (£60) → Team B
Team B: Player Y (£40) → Team A

After Swap:
- Player X now in Team B with £40 value (took Player Y's value)
- Player Y now in Team A with £60 value (took Player X's value)
- Team A: Budget unchanged
- Team B: Budget unchanged
- Values swapped between players
```

### Scenario 2: Double Swap
```
Team A: Player X (£50) + Player Y (£40) → Team B
Team B: Player Z (£60) + Player W (£20) → Team A

After Swap:
- Player X now in Team B with £60 value (took Player Z's value)
- Player Y now in Team B with £20 value (took Player W's value)
- Player Z now in Team A with £50 value (took Player X's value)
- Player W now in Team A with £40 value (took Player Y's value)
- Team A: Budget unchanged
- Team B: Budget unchanged
- Each player took their counterpart's value
```

### Scenario 3: Triple Swap
```
Team A: Players X (£50) + Y (£40) + Z (£30) → Team B
Team B: Players A (£60) + B (£35) + C (£25) → Team A

After Swap:
- Player X → Team B with £60 (took A's value)
- Player Y → Team B with £35 (took B's value)
- Player Z → Team B with £25 (took C's value)
- Player A → Team A with £50 (took X's value)
- Player B → Team A with £40 (took Y's value)
- Player C → Team A with £30 (took Z's value)
- Both teams: Budget unchanged
- Perfect value exchange
```

## Validation Rules

### Required
- ✅ Both teams must exist in the season
- ✅ All players must exist
- ✅ All players must be ACTIVE with their current team
- ✅ Each team must provide at least 1 player
- ✅ **Must be even swap** - Same number of players from each team
- ✅ Cannot swap within the same team

### Automatic
- ✅ Players swap values with their counterparts
- ✅ No budget changes
- ✅ Transfer history preserved (marked SWAPPED_OUT)
- ✅ New transfers created with ACTIVE status
- ✅ Financial ledger entries created (£0 amount for tracking)

## Benefits

### Fair Trading
- Teams exchange equal number of players
- Players swap values with each other
- No budget manipulation

### Value Exchange
- Player A takes Player B's value
- Player B takes Player A's value
- Simple and transparent

### Historical Record
- All swaps tracked in transfer_history
- Old transfers marked SWAPPED_OUT
- Swap description in acquisitionNotes

### Budget Integrity
- No budget changes
- Total league budget remains constant
- No money created or destroyed

### Flexibility
- Single, double, triple, or more player swaps
- Must be even numbers (1-for-1, 2-for-2, etc.)
- Custom notes for each swap

## Migration from Transfer System

### Old Transfer API
- **Endpoint**: `/api/admin/players/transfer`
- **Behavior**: One-way movement, free to receiving team
- **Status**: Still available but deprecated

### New Swap API
- **Endpoint**: `/api/admin/players/swap`
- **Behavior**: Two-way exchange, value-based
- **Status**: Recommended for all player movements

### Recommendation
Use the swap API for all player movements between teams. The old transfer API should only be used for special cases where a one-way free transfer is genuinely needed.

## UI Integration

### Admin Tools Page
Add a "Player Swap" tool to the admin tools page:
- Select Season
- Select Team 1 and Team 2
- Multi-select players from each team
- Preview swap details (values, budget changes)
- Confirm swap

### Swap Preview
Before confirming, show:
- Players being exchanged
- Current values for each player
- New values after swap (swapped with counterpart)
- Confirmation that budgets remain unchanged

### Example UI Flow
```
1. Select Season: TFCS-4
2. Select Team 1: Manchester United
3. Select Team 1 Players: [Ronaldo (£80), Messi (£70)]
4. Select Team 2: Real Madrid
5. Select Team 2 Players: [Benzema (£60), Modric (£50)]

Preview:
┌─────────────────────────────────────────┐
│ Manchester United → Real Madrid         │
│ • Ronaldo (£80 → £60)                   │
│ • Messi (£70 → £50)                     │
└─────────────────────────────────────────┘
                  ↕
┌─────────────────────────────────────────┐
│ Real Madrid → Manchester United         │
│ • Benzema (£60 → £80)                   │
│ • Modric (£50 → £70)                    │
└─────────────────────────────────────────┘

Value Exchange:
• Ronaldo takes Benzema's value (£80 → £60)
• Messi takes Modric's value (£70 → £50)
• Benzema takes Ronaldo's value (£60 → £80)
• Modric takes Messi's value (£50 → £70)

Budget Impact:
• Manchester United: No change
• Real Madrid: No change

[Confirm Swap] [Cancel]
```

## Testing Checklist

- [ ] Single swap (1-for-1) - verify values exchange
- [ ] Double swap (2-for-2) - verify each player gets counterpart's value
- [ ] Triple swap (3-for-3) - verify all values exchange correctly
- [ ] Verify no budget changes occur
- [ ] Verify transfer_history status updates to SWAPPED_OUT
- [ ] Verify new transfers created with ACTIVE status and swapped values
- [ ] Verify financial ledger entries created with £0 amount
- [ ] Verify squad sizes remain the same
- [ ] Verify player ownership changes correctly
- [ ] Test with invalid player IDs
- [ ] Test with players not in specified teams
- [ ] Test with same team for both sides
- [ ] Test with empty player arrays
- [ ] Test uneven swap (should fail with error)
- [ ] Test 4-for-4, 5-for-5 swaps

## Related Files

- `app/api/admin/players/swap/route.ts` - Swap API implementation
- `app/api/admin/players/transfer/route.ts` - Old transfer API (deprecated)
- `app/api/admin/players/release/route.ts` - Release API (different use case)
- `PLAYER-RELEASE-PROCESS.md` - Release documentation
- `TRANSFER-STATUS-MIGRATION-COMPLETE.md` - Status column migration
