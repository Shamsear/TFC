# eFootball Database Import System

## Overview
Comprehensive import system for eFootball player database with full preview, editing, and duplicate resolution capabilities.

## Features
- **Import Mode**: Import all players from a new database
- **Update Mode**: Update existing season with changed stats
- **Preview System**: Review all players before importing (paginated, 20 per page)
- **Duplicate Detection**: Automatically flags players with same name + position
- **Change Tracking**: Side-by-side comparison of old vs new stats
- **Full Stats Support**: 30+ player attributes including offensive, defensive, physical, and goalkeeper stats

## Database Migration

### Step 1: Run the Migration
```bash
# Connect to your database and run:
psql $DATABASE_URL -f prisma/migrations/add_detailed_player_stats.sql
```

Or manually execute the SQL in your database client.

### Step 2: Regenerate Prisma Client
```bash
npx prisma generate
```

## Usage

### 1. Access Import Page
Navigate to: `/sub-admin/import`

### 2. Select Season
Choose the season you want to import players for.

### 3. Choose Import Mode
- **Import**: For new seasons - imports all players
- **Update**: For existing seasons - shows changes and new players

### 4. Upload Database
Upload your `efootball_latest.db` file (or any compatible SQLite database).

### 5. Preview Players
- View all players with pagination (20 per page)
- Filter by position (GK, DEF, MID, FWD)
- Search by player name or team
- Tabs: All, New, Changed, Unchanged, Duplicates
- Expand player cards to see all 30+ stats

### 6. Review Changes (Update Mode Only)
- Side-by-side comparison of old vs new stats
- Changed fields highlighted in orange
- Accept or reject individual player updates

### 7. Resolve Duplicates
For players with same name + position:
- **Skip**: Keep existing, ignore new
- **Replace**: Update existing with new stats
- **Add Anyway**: Add as separate player (may cause duplicates)

### 8. Confirm Import
- Review summary of selected players
- Confirm to process import
- View results: imported, updated, skipped counts

## Database Structure

### Player Stats Fields
The `seasonal_player_stats` table now includes:

**Basic Info:**
- nationality
- playingStyle

**Offensive Stats:**
- offensiveAwareness
- ballControl
- dribbling
- tightPossession
- lowPass
- loftedPass
- finishing
- heading
- setPieceTaking
- curl

**Physical Stats:**
- speed
- acceleration
- kickingPower
- jumping
- physicalContact
- balance
- stamina

**Defensive Stats:**
- defensiveAwareness
- tackling
- aggression
- defensiveEngagement

**Goalkeeper Stats:**
- gkAwareness
- gkCatching
- gkParrying
- gkReflexes
- gkReach

## Position Mapping
The import system automatically maps eFootball positions to our system:
- CB, LB, RB, LWB, RWB → DEF
- DMF, CMF, AMF, LMF, RMF → MID
- LWF, RWF, SS, CF → FWD
- GK → GK

## Player Images
Player images should be placed in `/public/players/` directory with filename format:
```
/public/players/{player_id}.jpg
```

Example: `/public/players/108279.jpg`

If image is missing, a default placeholder will be shown.

## Components

### ImportWizard
Main wizard component with 4 steps:
1. Upload
2. Preview
3. Confirm
4. Complete

### PlayerPreviewList
- Tabbed interface for filtering players
- Pagination (20 per page)
- Search and position filters
- Select/deselect players

### PlayerCard
- Full player information display
- Expandable detailed stats
- Position-based color coding
- Rating display

### ChangeComparisonCard
- Side-by-side old vs new comparison
- Highlighted changed fields
- Detailed stat breakdown

### DuplicateResolver
- Duplicate warning display
- Resolution options
- Existing player comparison

### ImportSummary
- Final confirmation screen
- Import statistics
- Action breakdown

## API Endpoints

### POST /api/import/preview
Analyzes database and returns preview data.

**Request:**
```typescript
FormData {
  file: File,
  seasonId: string,
  mode: 'import' | 'update'
}
```

**Response:**
```typescript
{
  mode: 'import' | 'update',
  seasonId: string,
  players: EFootballPlayer[],
  newPlayers: EFootballPlayer[],
  changedPlayers: PlayerChange[],
  unchangedPlayers: EFootballPlayer[],
  duplicates: DuplicateInfo[],
  stats: {
    total: number,
    new: number,
    changed: number,
    unchanged: number,
    duplicates: number
  }
}
```

### POST /api/import/confirm
Processes selected players and imports them.

**Request:**
```typescript
{
  seasonId: string,
  mode: 'import' | 'update',
  selectedPlayers: EFootballPlayer[],
  duplicateResolutions: Record<string, 'skip' | 'replace' | 'add'>
}
```

**Response:**
```typescript
{
  success: true,
  imported: number,
  updated: number,
  skipped: number
}
```

## Troubleshooting

### Migration Fails
- Ensure you're connected to the correct database
- Check if columns already exist
- Verify Prisma schema matches database

### Import Fails
- Check database file format (must be SQLite .db)
- Verify `players_all` table exists in database
- Check console for detailed error messages

### Duplicates Not Detected
- Duplicate detection is case-insensitive
- Based on exact name match + position match
- Check position mapping is correct

### Images Not Loading
- Verify images are in `/public/players/` directory
- Check filename matches `player_id` from database
- Ensure images are .jpg format

## Best Practices

1. **Always preview before importing** - Review all players and changes
2. **Resolve duplicates carefully** - Choose appropriate resolution for each case
3. **Use Update mode for existing seasons** - Preserves existing data
4. **Backup database before large imports** - Safety first
5. **Check import summary** - Verify counts match expectations

## Future Enhancements
- Bulk edit capabilities
- Import history tracking
- Rollback functionality
- CSV export of preview data
- Advanced filtering options
- Player comparison tools
