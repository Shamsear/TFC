# Position Groups Feature

## Overview
Create sub-groups for specific positions (CB, DMF, CMF, AMF, CF) to allow admins to distribute players equally into two groups based on overall rating. This enables balanced auction rounds.

## Database Schema Changes

### 1. Add `position_group` column to `seasonal_player_stats`

```sql
ALTER TABLE seasonal_player_stats 
ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B'));

-- Add index for faster queries
CREATE INDEX idx_seasonal_player_stats_position_group 
ON seasonal_player_stats(position, position_group);
```

### 2. Update `auction_slots` table to include position group

```sql
ALTER TABLE auction_slots 
ADD COLUMN position_group VARCHAR(10) CHECK (position_group IN ('A', 'B', 'ALL'));

-- Default to 'ALL' for existing slots
UPDATE auction_slots SET position_group = 'ALL' WHERE position_group IS NULL;
```

## Positions with Groups

The following positions will have A/B groups:
- **CB** (Center Back)
- **DMF** (Defensive Midfielder)
- **CMF** (Central Midfielder)
- **AMF** (Attacking Midfielder)
- **CF** (Center Forward)

Other positions (GK, LB, RB, LMF, RMF, SS, LWF, RWF) will not have groups.

## Features

### 1. Auto-Distribution Algorithm

When players are imported, automatically distribute them into groups:

```typescript
function autoDistributePositionGroups(players: Player[], position: string) {
  // Filter players by position
  const positionPlayers = players.filter(p => p.position === position)
  
  // Sort by overall rating (descending)
  positionPlayers.sort((a, b) => b.overallRating - a.overallRating)
  
  // Distribute alternately: best to A, 2nd best to B, 3rd to A, etc.
  positionPlayers.forEach((player, index) => {
    player.positionGroup = index % 2 === 0 ? 'A' : 'B'
  })
  
  return positionPlayers
}
```

### 2. Manual Group Management Page

**Route:** `/sub-admin/[seasonId]/position-groups`

**Features:**
- View all players grouped by position
- See A/B distribution for CB, DMF, CMF, AMF, CF
- Drag-and-drop to move players between groups
- Swap players between groups
- View group statistics (count, avg rating)
- Balance groups automatically

**UI Components:**
- Position tabs (CB, DMF, CMF, AMF, CF)
- Two columns: Group A | Group B
- Player cards with drag handles
- Swap button between groups
- Auto-balance button
- Statistics panel

### 3. Auction Round Creation

When creating auction rounds, admins can specify:
- Position (e.g., CB)
- Position Group (A, B, or ALL)
- Slot order

**Example:**
```
Round 1:
- CB Group A (Slot 1)
- CB Group B (Slot 2)
- DMF Group A (Slot 3)
- DMF Group B (Slot 4)
```

### 4. Player Display Updates

Update all player lists to show position group:

**Badge Display:**
```tsx
<div className="flex items-center gap-2">
  <span className="font-bold">{position}</span>
  {positionGroup && (
    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
      Group {positionGroup}
    </span>
  )}
</div>
```

## Implementation Steps

### Phase 1: Database Migration
1. Add `position_group` column to `seasonal_player_stats`
2. Add `position_group` column to `auction_slots`
3. Create migration script

### Phase 2: Auto-Distribution
1. Create distribution algorithm
2. Run on import/update
3. Add to import service

### Phase 3: Management UI
1. Create position groups page
2. Implement drag-and-drop
3. Add swap functionality
4. Add auto-balance feature

### Phase 4: Auction Integration
1. Update auction slot creation
2. Filter players by position group
3. Update auction display

### Phase 5: Display Updates
1. Add group badges to player cards
2. Update all player lists
3. Update filters

## API Endpoints

### GET `/api/seasons/[seasonId]/position-groups`
Returns players grouped by position and group

### POST `/api/seasons/[seasonId]/position-groups/swap`
Swap two players between groups

### POST `/api/seasons/[seasonId]/position-groups/auto-balance`
Auto-balance all position groups

### PATCH `/api/seasons/[seasonId]/players/[playerId]/group`
Update a player's position group

## Benefits

✅ **Balanced Auctions** - Equal distribution of talent  
✅ **Fair Competition** - Teams get similar quality players  
✅ **Flexible Management** - Manual override when needed  
✅ **Clear Organization** - Easy to see group distribution  
✅ **Automated Process** - Auto-distribution on import  

## Next Steps

1. Review and approve this design
2. Create database migration
3. Implement auto-distribution
4. Build management UI
5. Integrate with auction system
