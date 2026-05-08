# Enhanced Duplicate Detection System

## Overview
The import system now supports comprehensive duplicate detection with user choice in all scenarios.

## Duplicate Detection Scenarios

### 1. File vs File Duplicates
**When**: Multiple players with the same name and position exist within the uploaded file itself.

**UI Behavior**:
- Shows all duplicate instances side-by-side in a grid layout
- Each instance displays as a selectable card with:
  - Radio button indicator
  - Player name, team, ID
  - Overall rating and position
  - Key stats (Speed, Dribbling, Finishing)
- User selects which specific instance to keep
- Selected instance is highlighted with gold border and glow
- Other instances are automatically skipped

**Example**: Import file contains 3 players named "Messi" with position "FWD" but different ratings/teams.

### 2. File vs Database Duplicates
**When**: A player in the import file matches an existing player in the database (same name and position).

**UI Behavior**:
- Shows side-by-side comparison:
  - Left: New player from file (green theme)
  - Right: Existing player(s) in database (red theme)
- Three action options:
  - **Skip**: Keep existing database player, ignore new one
  - **Replace**: Update existing player with new stats from file
  - **Add Anyway**: Add as separate player (may cause duplicates)

**Example**: Import file has "Ronaldo" (FWD, rating 89) but database already has "Ronaldo" (FWD, rating 87).

### 3. Combined Scenarios
The system handles both types simultaneously. Each duplicate is resolved independently.

## Technical Implementation

### Preview API (`/api/import/preview`)
- Detects file-vs-file duplicates by grouping players with same name+position
- Creates ONE duplicate entry per group (not one per player)
- Stores all instances in `allFileInstances` array
- Marks duplicate type as `'file-vs-file'` or `'file-vs-db'`

### Duplicate Resolver Component
- Renders different UI based on `duplicateType`
- File-vs-file: Grid of selectable cards with radio buttons
- File-vs-db: Side-by-side comparison with skip/replace/add buttons
- Stores selected playerId for file-vs-file duplicates

### Confirm API (`/api/import/confirm`)
- Receives all duplicate instances
- For file-vs-file: Only imports the player matching the selected playerId
- For file-vs-db: Applies skip/replace/add logic
- Skips non-selected instances automatically

## User Experience

### File vs File Flow
1. Upload file with duplicates
2. Preview shows duplicate warning in "Duplicates" tab
3. Click duplicate to see all instances side-by-side
4. Select preferred instance (default: first one)
5. Confirm import
6. Only selected instance is imported, others skipped

### File vs DB Flow
1. Upload file with player matching database
2. Preview shows duplicate warning
3. Choose action: Skip, Replace, or Add Anyway
4. Confirm import
5. Action is applied to the duplicate

## Color Palette
- Gold/Amber theme: `#E8A800`, `#FFB347`, `#FFC93A`
- Selected state: Gold border with shadow
- File-vs-file instances: Gold accent
- File-vs-db new: Emerald theme
- File-vs-db existing: Red theme

## Files Modified
- `app/api/import/preview/route.ts` - Enhanced duplicate detection logic
- `app/api/import/confirm/route.ts` - Handle playerId-based resolutions
- `components/import/DuplicateResolver.tsx` - Dual UI for both duplicate types
- `components/import/ImportWizard.tsx` - Pass all instances to confirm API
- `components/import/PlayerPreviewList.tsx` - Updated type definitions
