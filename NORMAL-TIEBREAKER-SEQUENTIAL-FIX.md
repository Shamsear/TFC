# Normal Round Tiebreaker Sequential Resolution Fix

## Problem Statement

### Current Flawed Implementation

The current system creates **ALL tiebreakers at once** when finalization detects ties. This causes a critical issue:

**Example Scenario:**
```
Round has 3 players with ties:
- Player A: Team 1, Team 2, Team 3 all bid £50,000
- Player B: Team 1, Team 2, Team 3 all bid £45,000  
- Player C: Team 1, Team 2, Team 3 all bid £40,000

Current system creates 3 tiebreakers simultaneously:
❌ Tiebreaker 1: Player A (Team 1, Team 2, Team 3)
❌ Tiebreaker 2: Player B (Team 1, Team 2, Team 3)
❌ Tiebreaker 3: Player C (Team 1, Team 2, Team 3)
```

**The Problem:**
- All 3 teams are in all 3 tiebreakers
- After Team 1 wins Player A, they should be **removed** from tiebreakers for Player B and C
- After Team 2 wins Player B, they should be **removed** from tiebreaker for Player C
- Team 3 should **automatically win** Player C (only team left)

**Current behavior:** All 3 tiebreakers remain active with all 3 teams, causing confusion and potential for teams to win multiple players (violating the 1-player-per-team rule).

---

## Correct Sequential Approach

### How It Should Work

**Finalization should be INCREMENTAL and RESUMABLE:**

```
1. Start finalization
2. Process bids in order (highest to lowest)
3. When tie detected:
   a. STOP finalization
   b. Create ONLY the first tiebreaker
   c. Mark round as 'tiebreaker_pending'
   d. Wait for teams to submit bids
4. When tiebreaker resolved:
   a. Apply winner's allocation
   b. Remove winner from remaining bid pool
   c. RESUME finalization from where it stopped
   d. Continue processing remaining bids
5. If another tie found:
   a. STOP again
   b. Create next tiebreaker
   c. Repeat process
6. When no more ties:
   a. Complete finalization
   b. Mark round as 'completed'
```

### Example Flow

**Initial State:**
```
Player A: Team 1 (£50k), Team 2 (£50k), Team 3 (£50k) → TIE
Player B: Team 1 (£45k), Team 2 (£45k), Team 3 (£45k) → TIE
Player C: Team 1 (£40k), Team 2 (£40k), Team 3 (£40k) → TIE
```

**Step 1: First Finalization Attempt**
```
✓ Process Player A
❌ TIE DETECTED (Team 1, Team 2, Team 3)
⏸️  PAUSE finalization
📝 Create Tiebreaker 1 for Player A
🔒 Round status: 'tiebreaker_pending'
```

**Step 2: Tiebreaker 1 Resolution**
```
Teams submit new bids:
- Team 1: £55,000
- Team 2: £52,000
- Team 3: £51,000

Winner: Team 1 at £55,000
✓ Apply allocation: Player A → Team 1
✓ Remove Team 1 from bid pool
```

**Step 3: Resume Finalization**
```
Remaining bids:
Player B: Team 2 (£45k), Team 3 (£45k) → TIE
Player C: Team 2 (£40k), Team 3 (£40k) → TIE

✓ Process Player B
❌ TIE DETECTED (Team 2, Team 3) ← Only 2 teams now!
⏸️  PAUSE finalization
📝 Create Tiebreaker 2 for Player B
🔒 Round status: 'tiebreaker_pending'
```

**Step 4: Tiebreaker 2 Resolution**
```
Teams submit new bids:
- Team 2: £48,000
- Team 3: £47,000

Winner: Team 2 at £48,000
✓ Apply allocation: Player B → Team 2
✓ Remove Team 2 from bid pool
```

**Step 5: Resume Finalization Again**
```
Remaining bids:
Player C: Team 3 (£40k) → ONLY ONE TEAM!

✓ Process Player C
✓ No tie (only Team 3 left)
✓ Allocate Player C → Team 3 at £40,000
✅ Finalization complete
🏁 Round status: 'completed'
```

**Final Result:**
- Player A → Team 1 (£55,000)
- Player B → Team 2 (£48,000)
- Player C → Team 3 (£40,000)

Each team gets exactly 1 player ✓

---

## Implementation Requirements

### 1. Finalization State Tracking

Add to `rounds` table:
```sql
ALTER TABLE rounds ADD COLUMN finalization_state JSONB;
```

Store:
```json
{
  "allocatedTeams": ["team-1", "team-2"],
  "allocatedPlayers": ["player-a", "player-b"],
  "processedBids": [
    {"playerId": "player-a", "teamId": "team-1", "amount": 55000}
  ],
  "remainingBids": [
    {"playerId": "player-c", "teamId": "team-3", "amount": 40000}
  ]
}
```

### 2. Modified Finalization Algorithm

```typescript
export async function finalizeRound(roundId: string): Promise<FinalizationResult> {
  // 1. Check if resuming from tiebreaker
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: { finalizationState: true, status: true }
  });

  let allocatedTeams = new Set<string>();
  let allocatedPlayers = new Set<string>();
  let existingAllocations: Allocation[] = [];

  if (round.finalizationState) {
    // Resume from saved state
    const state = round.finalizationState as any;
    allocatedTeams = new Set(state.allocatedTeams || []);
    allocatedPlayers = new Set(state.allocatedPlayers || []);
    existingAllocations = state.processedBids || [];
  }

  // 2. Fetch all bids
  const teamBids = await fetchAllBids(roundId);
  const playerBidsMap = buildPlayerBidsMap(teamBids);

  // 3. Filter out already allocated teams and players
  for (const [playerId, bids] of playerBidsMap.entries()) {
    if (allocatedPlayers.has(playerId)) {
      playerBidsMap.delete(playerId);
      continue;
    }

    // Remove allocated teams from this player's bids
    const filteredBids = bids.filter(b => !allocatedTeams.has(b.teamId));
    if (filteredBids.length === 0) {
      playerBidsMap.delete(playerId);
    } else {
      playerBidsMap.set(playerId, filteredBids);
    }
  }

  // 4. Process bids ONE AT A TIME
  while (playerBidsMap.size > 0) {
    // Find highest bid
    let highestBid: { teamId: string; amount: number; playerId: string } | null = null;

    for (const [playerId, bids] of playerBidsMap.entries()) {
      const sorted = [...bids].sort((a, b) => b.amount - a.amount);
      
      // Check for tie
      if (sorted.length > 1 && sorted[0].amount === sorted[1].amount) {
        // TIE DETECTED - STOP HERE
        const tiedAmount = sorted[0].amount;
        const tiedTeams = sorted
          .filter(b => b.amount === tiedAmount)
          .map(b => b.teamId);

        // Save current state
        await prisma.rounds.update({
          where: { id: roundId },
          data: {
            finalizationState: {
              allocatedTeams: Array.from(allocatedTeams),
              allocatedPlayers: Array.from(allocatedPlayers),
              processedBids: existingAllocations
            }
          }
        });

        // Return with tie info (will create ONE tiebreaker)
        return {
          success: false,
          allocations: existingAllocations,
          tieDetected: true,
          ties: [{
            basePlayerId: playerId,
            playerName: await getPlayerName(playerId),
            amount: tiedAmount,
            tiedTeams
          }]
        };
      }

      // No tie - check if highest overall
      if (!highestBid || sorted[0].amount > highestBid.amount) {
        highestBid = {
          teamId: sorted[0].teamId,
          amount: sorted[0].amount,
          playerId
        };
      }
    }

    if (!highestBid) break;

    // Allocate this player
    existingAllocations.push({
      teamId: highestBid.teamId,
      basePlayerId: highestBid.playerId,
      playerName: await getPlayerName(highestBid.playerId),
      amount: highestBid.amount,
      acquisitionType: 'bid_won'
    });

    allocatedTeams.add(highestBid.teamId);
    allocatedPlayers.add(highestBid.playerId);
    playerBidsMap.delete(highestBid.playerId);

    // Remove this team from all other bids
    for (const [pid, bids] of playerBidsMap.entries()) {
      const filtered = bids.filter(b => b.teamId !== highestBid!.teamId);
      if (filtered.length === 0) {
        playerBidsMap.delete(pid);
      } else {
        playerBidsMap.set(pid, filtered);
      }
    }
  }

  // No more ties - finalization complete
  await prisma.rounds.update({
    where: { id: roundId },
    data: {
      finalizationState: null // Clear state
    }
  });

  return {
    success: true,
    allocations: existingAllocations,
    tieDetected: false
  };
}
```

### 3. Tiebreaker Resolution Trigger

When a tiebreaker is resolved:

```typescript
export async function onTiebreakerResolved(tiebreakerId: string) {
  const tiebreaker = await prisma.tiebreakers.findUnique({
    where: { id: tiebreakerId },
    include: { round: true }
  });

  if (!tiebreaker) return;

  // 1. Apply tiebreaker result
  await applyTiebreakerResult(
    tiebreakerId,
    tiebreaker.winningTeamId!,
    tiebreaker.winningBid!
  );

  // 2. Check if any other active tiebreakers for this round
  const otherActiveTiebreakers = await prisma.tiebreakers.count({
    where: {
      roundId: tiebreaker.roundId,
      status: 'active',
      id: { not: tiebreakerId }
    }
  });

  if (otherActiveTiebreakers === 0) {
    // 3. No other active tiebreakers - RESUME FINALIZATION
    const result = await finalizeRound(tiebreaker.roundId);

    if (result.tieDetected && result.ties) {
      // Another tie found - create next tiebreaker
      await createTiebreakers(tiebreaker.roundId, result.ties);
      // Status remains 'tiebreaker_pending'
    } else if (result.success) {
      // Finalization complete
      await applyFinalizationResults(tiebreaker.roundId, result.allocations);
      await prisma.rounds.update({
        where: { id: tiebreaker.roundId },
        data: { status: 'completed' }
      });
    }
  }
}
```

### 4. API Route Changes

```typescript
// app/api/tiebreakers/[id]/bid/route.ts

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // ... existing bid submission logic ...

  // After successful bid submission
  const allSubmitted = await checkTiebreakerComplete(tiebreakerId);

  if (allSubmitted) {
    // Resolve tiebreaker
    const result = await resolveTiebreaker(tiebreakerId);

    if (result.success) {
      // Trigger resume finalization
      await onTiebreakerResolved(tiebreakerId);
    }
  }

  return NextResponse.json({ success: true });
}
```

---

## Benefits of Sequential Approach

✅ **Correct allocation:** Each team gets maximum 1 player
✅ **No confusion:** Only one active tiebreaker at a time
✅ **Automatic resolution:** If only 1 team left, they win automatically
✅ **Fair process:** Teams know exactly which player they're competing for
✅ **Resumable:** Finalization can pause and resume multiple times
✅ **State tracking:** System knows exactly where it left off

---

## Migration Path

### Phase 1: Add State Tracking
```sql
ALTER TABLE rounds ADD COLUMN finalization_state JSONB;
```

### Phase 2: Update Finalization Logic
- Modify `lib/auction/finalize-round.ts`
- Add state save/restore
- Process one tie at a time

### Phase 3: Update Tiebreaker Resolution
- Add `onTiebreakerResolved` function
- Auto-resume finalization after resolution

### Phase 4: Update API Routes
- Modify tiebreaker bid submission
- Trigger auto-resume on completion

### Phase 5: Testing
- Test with multiple ties
- Verify sequential resolution
- Confirm state persistence

---

## Summary

The current "create all tiebreakers at once" approach is fundamentally flawed. The correct approach is:

1. **Finalize incrementally** - process bids one at a time
2. **Stop at first tie** - create only one tiebreaker
3. **Save state** - remember where finalization stopped
4. **Resume after resolution** - continue from saved state
5. **Repeat** - until no more ties

This ensures each team gets exactly 1 player and eliminates confusion from multiple simultaneous tiebreakers.
