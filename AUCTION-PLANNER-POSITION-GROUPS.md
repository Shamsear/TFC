# Auction Planner - Position Groups Feature

## Overview
The auction planner now supports planning by position groups in addition to individual positions. This allows team managers to plan their squad at a higher level and see aggregated information across related positions.

## Position Groups
The following position groups are available:

1. **Goalkeeper**: GK
2. **Defenders**: CB, LB, RB
3. **Midfielders**: DMF, CMF, LMF, RMF, AMF
4. **Forwards**: SS, LWF, RWF, CF

## Features

### Mode Toggle
- Users can switch between "By Position" and "By Group" modes
- Toggle is available in both mobile tabs and desktop sidebar
- Mode preference is maintained while navigating

### Group View
When in group mode:

1. **Navigation**
   - Mobile: Horizontal tabs show group names (Goalkeeper, Defenders, etc.)
   - Desktop: Sidebar shows group names with aggregated stats

2. **Player List**
   - Shows all players from all positions in the selected group
   - Header displays the group name (e.g., "Available Defenders Players")
   - Players maintain their individual position labels

3. **Target Management**
   - Targets from all positions in the group are displayed together
   - Each target shows its specific position (e.g., CB, LB, RB for Defenders)
   - Adding a player adds them to their actual position, not the group
   - Removing/updating targets works correctly across positions

4. **Min/Max Players**
   - Shows aggregated totals for the entire group
   - When editing, values are distributed evenly across positions in the group
   - Example: Setting "Max Players: 6" for Defenders distributes as 2-2-2 across CB, LB, RB

5. **Statistics**
   - Target counts show total targets across all positions in the group
   - Starred counts show total starred players in the group
   - Min/Max displays show aggregated values

### Position View
When in position mode:
- Works exactly as before
- Shows individual positions (GK, CB, LB, etc.)
- All planning is done at the position level

## Implementation Details

### State Management
- `groupMode`: 'positions' | 'groups' - tracks current mode
- Mode affects filtering, display, and calculations throughout the component

### Key Functions
- `positionPlayers`: Filters players based on mode (single position or group)
- `addPlayerTarget`: Always adds to player's actual position
- `removePlayerTarget`: Finds correct position in group mode
- `updatePlayerTarget`: Updates target in correct position
- Min/Max inputs: Distribute values across group positions

### Data Structure
- Targets are always stored at the position level (not group level)
- Groups are a view/aggregation layer on top of position data
- This ensures data consistency and allows switching between modes

## User Benefits

1. **High-Level Planning**: Plan squad composition at the group level
2. **Flexibility**: Switch between detailed and overview planning
3. **Better Organization**: See all defenders/midfielders/forwards together
4. **Easier Budgeting**: Set min/max players for entire groups
5. **Comprehensive View**: See all targets for a group in one place

## Technical Notes

- No database changes required - groups are a UI-only feature
- All data is stored at the position level for consistency
- Group calculations are performed in real-time
- Mode switching is instant with no data loss
- TypeScript types ensure type safety across modes
