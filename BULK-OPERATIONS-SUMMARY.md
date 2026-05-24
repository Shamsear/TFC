# Bulk Operations Summary

## Overview
Both the Player Swap and Player Release APIs support bulk operations, allowing admins to process multiple operations in a single request.

## Player Swap API

### Endpoint
`POST /api/admin/players/swap`

### Bulk Capability
✅ **Supports multiple swaps between different team pairs**

### Example: Multiple Team Combinations
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    {
      "team1Id": "manchester-united",
      "team2Id": "real-madrid",
      "team1PlayerIds": ["ronaldo", "rooney"],
      "team2PlayerIds": ["benzema", "modric"],
      "notes": "Man Utd ↔ Real Madrid double swap"
    },
    {
      "team1Id": "barcelona",
      "team2Id": "bayern-munich",
      "team1PlayerIds": ["messi"],
      "team2PlayerIds": ["lewandowski"],
      "notes": "Barcelona ↔ Bayern single swap"
    },
    {
      "team1Id": "chelsea",
      "team2Id": "juventus",
      "team1PlayerIds": ["hazard", "kante", "willian"],
      "team2PlayerIds": ["dybala", "higuain", "cuadrado"],
      "notes": "Chelsea ↔ Juventus triple swap"
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "swapped": 3,
  "errors": 0,
  "details": {
    "successfulSwaps": [
      {
        "swapType": "Double",
        "team1": { "name": "Manchester United", ... },
        "team2": { "name": "Real Madrid", ... },
        "valueSwaps": [...]
      },
      {
        "swapType": "Single",
        "team1": { "name": "Barcelona", ... },
        "team2": { "name": "Bayern Munich", ... },
        "valueSwaps": [...]
      },
      {
        "swapType": "Triple",
        "team1": { "name": "Chelsea", ... },
        "team2": { "name": "Juventus", ... },
        "valueSwaps": [...]
      }
    ],
    "errors": []
  }
}
```

### Key Features
- ✅ Process multiple swaps in one transaction
- ✅ Different team pairs in same request
- ✅ Mix of single, double, triple swaps
- ✅ Each swap can have different notes
- ✅ All swaps committed together or all rolled back
- ✅ Individual swap failures don't stop others

## Player Release API

### Endpoint
`POST /api/admin/players/release`

### Bulk Capability
✅ **Supports releases from multiple teams**

### Example: Multiple Teams
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    {
      "playerId": "player-1",
      "teamId": "manchester-united",
      "notes": "Released from Man Utd"
    },
    {
      "playerId": "player-2",
      "teamId": "manchester-united",
      "notes": "Released from Man Utd"
    },
    {
      "playerId": "player-3",
      "teamId": "real-madrid",
      "notes": "Released from Real Madrid"
    },
    {
      "playerId": "player-4",
      "teamId": "barcelona",
      "notes": "Released from Barcelona"
    },
    {
      "playerId": "player-5",
      "teamId": "real-madrid",
      "notes": "Released from Real Madrid"
    }
  ]
}
```

### Response
```json
{
  "success": true,
  "released": 5,
  "errors": 0,
  "details": {
    "successfulReleases": [
      {
        "playerId": "player-1",
        "playerName": "John Doe",
        "teamId": "manchester-united",
        "refundAmount": 50
      },
      {
        "playerId": "player-2",
        "playerName": "Jane Smith",
        "teamId": "manchester-united",
        "refundAmount": 60
      },
      {
        "playerId": "player-3",
        "playerName": "Bob Johnson",
        "teamId": "real-madrid",
        "refundAmount": 70
      },
      {
        "playerId": "player-4",
        "playerName": "Alice Williams",
        "teamId": "barcelona",
        "refundAmount": 55
      },
      {
        "playerId": "player-5",
        "playerName": "Charlie Brown",
        "teamId": "real-madrid",
        "refundAmount": 45
      }
    ],
    "errors": []
  }
}
```

### Key Features
- ✅ Release multiple players in one transaction
- ✅ Players from different teams in same request
- ✅ Each release can have different notes
- ✅ All releases committed together or all rolled back
- ✅ Individual release failures don't stop others
- ✅ Each team gets appropriate budget refund

## Comparison

| Feature | Swap API | Release API |
|---------|----------|-------------|
| **Bulk Operations** | ✅ Yes | ✅ Yes |
| **Multiple Teams** | ✅ Yes (team pairs) | ✅ Yes (any teams) |
| **Transaction Safety** | ✅ All or nothing | ✅ All or nothing |
| **Individual Errors** | ✅ Continues processing | ✅ Continues processing |
| **Budget Changes** | ❌ No changes | ✅ Refunds to teams |
| **Value Changes** | ✅ Values swap | ❌ N/A |
| **Status Updates** | `SWAPPED_OUT` → `ACTIVE` | `ACTIVE` → `RELEASED` |

## Use Cases

### Scenario 1: End of Season Restructuring
Multiple teams want to swap and release players:

**Step 1**: Process all swaps
```json
{
  "seasonId": "TFCS-4",
  "swaps": [
    { "team1Id": "A", "team2Id": "B", ... },
    { "team1Id": "C", "team2Id": "D", ... },
    { "team1Id": "E", "team2Id": "F", ... }
  ]
}
```

**Step 2**: Release unwanted players
```json
{
  "seasonId": "TFCS-4",
  "releases": [
    { "playerId": "p1", "teamId": "A", ... },
    { "playerId": "p2", "teamId": "B", ... },
    { "playerId": "p3", "teamId": "C", ... }
  ]
}
```

### Scenario 2: League-Wide Player Movement
Admin facilitates multiple trades in one go:
- Team A ↔ Team B: 2-for-2 swap
- Team C ↔ Team D: 1-for-1 swap
- Team E ↔ Team F: 3-for-3 swap
- All processed in single request

### Scenario 3: Squad Size Compliance
Multiple teams need to release players to meet squad limits:
- Team A releases 3 players
- Team B releases 2 players
- Team C releases 4 players
- All processed in single request

## Error Handling

### Partial Success
Both APIs support partial success - some operations succeed while others fail:

```json
{
  "success": true,
  "swapped": 2,
  "errors": 1,
  "details": {
    "successfulSwaps": [
      { "swapType": "Single", ... },
      { "swapType": "Double", ... }
    ],
    "errors": [
      {
        "swap": { "team1Id": "X", "team2Id": "Y", ... },
        "error": "Uneven swap not allowed"
      }
    ]
  }
}
```

### Transaction Safety
- All successful operations committed together
- Failed operations don't affect successful ones
- Database remains consistent
- Detailed error messages for debugging

## Performance Considerations

### Batch Processing
- Single database transaction for all operations
- Reduces network overhead
- Faster than individual requests
- Atomic commits ensure consistency

### Recommended Limits
- **Swaps**: Up to 10 swaps per request
- **Releases**: Up to 50 releases per request
- Larger batches may timeout
- Split into multiple requests if needed

## Best Practices

### 1. Group Related Operations
```json
// Good: Related swaps together
{
  "swaps": [
    { "team1Id": "A", "team2Id": "B", ... },
    { "team1Id": "A", "team2Id": "C", ... }
  ]
}
```

### 2. Use Descriptive Notes
```json
{
  "releases": [
    {
      "playerId": "p1",
      "teamId": "A",
      "notes": "End of season release - contract expired"
    }
  ]
}
```

### 3. Handle Partial Success
```typescript
const response = await fetch('/api/admin/players/swap', {
  method: 'POST',
  body: JSON.stringify(data)
});

const result = await response.json();

if (result.errors.length > 0) {
  console.log(`${result.swapped} succeeded, ${result.errors.length} failed`);
  result.details.errors.forEach(err => {
    console.error(`Failed: ${err.error}`);
  });
}
```

### 4. Validate Before Sending
- Check player ownership
- Verify even swap counts
- Ensure teams exist
- Validate player IDs

## Testing Checklist

### Swap API
- [ ] Single swap between two teams
- [ ] Multiple swaps between different team pairs
- [ ] Mix of single, double, triple swaps
- [ ] Partial success (some swaps fail)
- [ ] All swaps fail
- [ ] Uneven swap rejection
- [ ] Same team rejection

### Release API
- [ ] Single release from one team
- [ ] Multiple releases from one team
- [ ] Releases from multiple teams
- [ ] Partial success (some releases fail)
- [ ] All releases fail
- [ ] Already released player rejection
- [ ] Player not in team rejection

## Related Documentation

- `PLAYER-SWAP-SYSTEM.md` - Complete swap documentation
- `PLAYER-SWAP-FINAL.md` - Swap implementation details
- `PLAYER-RELEASE-PROCESS.md` - Complete release documentation
- `TRANSFER-STATUS-MIGRATION-COMPLETE.md` - Status system migration
- `app/api/admin/players/swap/route.ts` - Swap API code
- `app/api/admin/players/release/route.ts` - Release API code
