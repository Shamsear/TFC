# Spin & Resolve Tiebreaker Feature

## Overview
Sub-admins can now instantly resolve tiebreakers using a random "spin" mechanism, eliminating the need for teams to submit new bids. This is useful when teams are unavailable or when a quick resolution is needed.

## How It Works

### Spin Resolution Logic
When a tiebreaker is resolved via spin:

1. **Random Selection**: One team is randomly selected as the winner
2. **Winner Payment**: Winner pays **original bid + £2**
3. **Loser Payment**: All losing teams pay **original bid + £1**
4. **Automatic Processing**: 
   - Winner gets the player
   - Budgets are updated
   - Transfer history is created
   - Round finalization continues automatically

### Example
If 3 teams tied at £100:
- **Winner**: Pays £102, gets the player
- **Loser 1**: Pays £101, doesn't get the player
- **Loser 2**: Pays £101, doesn't get the player

## Implementation Details

### New API Endpoint
**File:** `app/api/admin/tiebreakers/[id]/spin-resolve/route.ts`

- **Endpoint:** `POST /api/admin/tiebreakers/[id]/spin-resolve`
- **Authorization:** SUB_ADMIN or SUPER_ADMIN only
- **No Parameters Required**

**Process:**
1. Validates tiebreaker is active
2. Randomly selects winner using `Math.random()`
3. Updates all team bids with final amounts
4. Marks tiebreaker as completed
5. Deducts winner's budget
6. Creates transfer history for winner
7. Resumes round finalization
8. Returns winner details and result

### UI Updates
**File:** `components/auction/RoundDetailClient.tsx`

**New State Variables:**
- `spinningTiebreaker`: Tracks which tiebreaker is being spun
- `showSpinModal`: Controls result modal visibility
- `spinResult`: Stores the spin result data

**New Function:**
- `handleSpinResolve()`: Handles the spin and resolve process

**UI Changes:**
- Added "🎰 Spin & Resolve" button on each tiebreaker card
- Button shows spinning animation during processing
- Animated result modal displays winner and bid amount
- Auto-refreshes page after 3 seconds to show updated state

## How to Use

1. Navigate to a round with active tiebreakers: `/sub-admin/[seasonId]/auction/rounds/[roundId]`
2. Scroll to the "Active Tiebreakers" section
3. Click the "🎰 Spin & Resolve" button on any tiebreaker
4. Confirm the action in the dialog (shows payment amounts)
5. Watch the spinning animation
6. See the winner revealed in the result modal
7. Page auto-refreshes to show updated round status

## Visual Features

### Spin Button
- Gradient purple-to-pink background
- Dice emoji (🎰) for visual appeal
- Spinning animation during processing
- Disabled state while spinning

### Result Modal
- Dramatic gradient background (purple to pink)
- Bouncing trophy animation
- Large winner display with team name
- Player name and winning bid amount
- Success message
- Auto-closes after 3 seconds

## When to Use

**Use Spin & Resolve when:**
- Teams are unavailable to submit bids
- Quick resolution is needed
- Fair random selection is acceptable
- Time is running out

**Use Manual Bid Submission when:**
- Teams want to compete with higher bids
- Strategic bidding is important
- Teams are available and engaged

## Security & Validation

- Only SUB_ADMIN and SUPER_ADMIN can spin
- Tiebreaker must be active (not already resolved)
- Requires at least 2 teams to spin
- All actions are logged with timestamps
- Budget validations ensure teams can afford the amounts
- Transfer history records the spin resolution method

## Database Changes

The spin resolution:
1. Updates `team_tiebreaker_bids` table with final bid amounts
2. Marks `tiebreakers` record as completed with winner
3. Updates `season_teams` budget for winner
4. Creates `transfer_history` record with acquisition note
5. Triggers automatic finalization checks

## Acquisition Notes

Transfer history records include:
```
"Won via spin resolution (X teams tied at £Y)"
```

This clearly indicates the player was acquired through spin, not competitive bidding.

## Auto-Finalization

After spin resolution:
- System checks if more tiebreakers exist
- If no more tiebreakers, round completes automatically
- If another tie is detected, new tiebreaker is created
- Sub-admin is notified of the outcome

## Fairness

The spin uses JavaScript's `Math.random()` which provides:
- Pseudo-random selection
- Equal probability for all teams
- Unpredictable outcome
- Fair resolution when teams can't bid

## Comparison: Spin vs Manual Bids

| Feature | Spin & Resolve | Manual Bids |
|---------|---------------|-------------|
| Speed | Instant | Waits for all teams |
| Team Input | None required | Teams submit bids |
| Winner Selection | Random | Highest bidder |
| Winner Payment | Original + £2 | Their bid amount |
| Loser Payment | Original + £1 | No payment |
| Use Case | Quick/unavailable | Competitive/strategic |

## Notes

- Spin resolution is **irreversible** - confirm before clicking
- All teams pay something (winner more, losers less)
- Losers still lose budget even though they don't get the player
- This simulates a "consolation" or "participation" cost
- Winner always pays exactly £2 more than original bid
- System logs all spin resolutions for audit purposes
