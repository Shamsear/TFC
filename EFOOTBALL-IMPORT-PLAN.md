# eFootball Database Import Plan

## Database Structure
The `efootball_latest.db` contains a `players_all` table with **3,275 players** and the following structure:

### Key Fields
- `player_id` (TEXT) - Unique identifier, used for image naming (e.g., `108279.jpg`)
- `player_name` (TEXT) - Full player name
- `position` (TEXT) - GK, DEF, MID, FWD (needs mapping)
- `team_name` (TEXT) - Real world club name
- `nationality` (TEXT) - Player nationality
- `overall_rating` (INTEGER) - Overall player rating (0-99)
- `playing_style` (TEXT) - Playing style description

### Detailed Stats (30+ attributes)
**Offensive:** offensive_awareness, ball_control, dribbling, tight_possession, low_pass, lofted_pass, finishing, heading, set_piece_taking, curl

**Physical:** speed, acceleration, kicking_power, jumping, physical_contact, balance, stamina

**Defensive:** defensive_awareness, tackling, aggression, defensive_engagement

**Goalkeeper:** gk_awareness, gk_catching, gk_parrying, gk_reflexes, gk_reach

## Import Workflow

### Mode 1: IMPORT (New Season)
1. **Upload Database** → Parse SQLite file
2. **Preview All Players** (Paginated)
   - Show all 3,275 players with stats
   - Allow editing before import
   - Flag duplicates (same name + position)
   - User can:
     - ✅ Select/deselect players
     - ✏️ Edit player details
     - 🔀 Resolve duplicate conflicts
     - 🗑️ Remove unwanted players
3. **Confirm & Import** → Create base_players + seasonal_player_stats

### Mode 2: UPDATE (Existing Season)
1. **Upload Database** → Parse SQLite file
2. **Preview Changes** (3 sections)
   
   **A. Changed Players** (Side-by-side comparison)
   - Old stats (left card) vs New stats (right card)
   - Highlight changed fields in yellow/orange
   - User can accept/reject changes
   
   **B. New Players** (Not in database)
   - Show all new players found
   - Flag duplicates (same name + position)
   - User can select which to add
   
   **C. Unchanged Players** (Optional view)
   - Players with no stat changes
   - Collapsed by default

3. **Confirm & Update** → Update seasonal_player_stats for selected players

## Duplicate Detection Rules
**Flag as duplicate if:**
- Same `player_name` (case-insensitive)
- Same `position` (after mapping)

**Resolution options:**
- Keep existing (skip new)
- Replace with new
- Add as separate player (rename)
- Merge stats (advanced)

## API Endpoints

### 1. Parse & Preview
```
POST /api/import/preview
Body: { file: File, seasonId: string, mode: 'import' | 'update' }
Returns: {
  players: Player[],
  duplicates: Duplicate[],
  changes: Change[] (update mode only),
  stats: { total, new, changed, unchanged }
}
```

### 2. Confirm Import
```
POST /api/import/confirm
Body: {
  seasonId: string,
  mode: 'import' | 'update',
  selectedPlayers: string[], // player_ids
  edits: Record<string, Partial<Player>>,
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add'>
}
Returns: { success: true, imported: number, updated: number }
```

## UI Components

### 1. ImportWizard Component
- Step 1: Upload & Mode Selection
- Step 2: Preview & Edit
- Step 3: Confirm & Process

### 2. PlayerPreviewCard Component
- Editable fields
- Duplicate warning badge
- Select checkbox
- Stat comparison (update mode)

### 3. DuplicateResolver Component
- Side-by-side comparison
- Resolution action buttons
- Merge option

## Implementation Steps

1. ✅ Created `lib/sqlite-parser.ts` to read SQLite database
2. ⏳ Create preview API endpoint
3. ⏳ Create confirm API endpoint
4. ⏳ Build ImportWizard UI component
5. ⏳ Build PlayerPreviewCard component
6. ⏳ Build DuplicateResolver component
7. ⏳ Update Prisma schema for detailed stats
8. ⏳ Create migration
9. ⏳ Test full workflow

## Benefits
- **User Control:** Review before importing
- **Conflict Resolution:** Handle duplicates intelligently
- **Change Tracking:** See exactly what will change
- **Flexibility:** Edit data before import
- **Safety:** No accidental overwrites
