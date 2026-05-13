# Starred Players Feature

## Overview
Teams can now star/favorite players to have them appear at the top of the player list during auction rounds. This helps teams quickly access their priority targets.

## Database Changes

### New Table: `starred_players`
```sql
CREATE TABLE starred_players (
  id SERIAL PRIMARY KEY,
  "seasonTeamId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "seasonId" TEXT NOT NULL,
  starred_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT "starred_players_unique" UNIQUE ("seasonTeamId", "playerId", "seasonId"),
  CONSTRAINT "starred_players_seasonTeamId_fkey" FOREIGN KEY ("seasonTeamId") REFERENCES "season_teams"("id") ON DELETE CASCADE,
  CONSTRAINT "starred_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "base_players"("id") ON DELETE CASCADE,
  CONSTRAINT "starred_players_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE
);
```

### Indexes
- `idx_starred_players_seasonTeamId` - For team lookups
- `idx_starred_players_playerId` - For player lookups
- `idx_starred_players_seasonId` - For season lookups
- `idx_starred_players_lookup` - Composite index for efficient queries

## API Endpoints

### GET `/api/team/starred-players`
Get all starred players for the current team in a season.

**Query Parameters:**
- `seasonId` (required) - The season ID

**Response:**
```json
{
  "starredPlayerIds": ["player-id-1", "player-id-2"]
}
```

### POST `/api/team/starred-players`
Star a player for the current team.

**Body:**
```json
{
  "playerId": "player-id",
  "seasonId": "season-id"
}
```

**Response:**
```json
{
  "success": true,
  "starredPlayer": { ... }
}
```

### DELETE `/api/team/starred-players`
Unstar a player for the current team.

**Query Parameters:**
- `playerId` (required) - The player ID
- `seasonId` (required) - The season ID

**Response:**
```json
{
  "success": true
}
```

## UI Changes

### PlayersSearchClient Component
- Added `seasonId` prop - Required for starring functionality
- Added `enableStarring` prop - Toggle star feature on/off
- Added star button to each player card
- Starred players automatically sort to the top of the list
- Star icon changes between filled (starred) and outline (not starred)
- Prevents duplicate starring requests with loading state

### NormalRoundBiddingClient Component (Regular Auction Rounds)
- Added star button to each player card
- Starred players automatically sort to the top of the list
- Loads starred players on component mount
- Star functionality works during active bidding

### BulkRoundSelectionClient Component (Bulk Auction Rounds)
- Added star button to each player card
- Starred players automatically sort to the top of the list
- Loads starred players on component mount
- Star functionality works during player selection

### Team Players Page
- Enabled starring functionality by passing `enableStarring={true}`
- Passes current `seasonId` to the component

## Usage

### For Team Managers
1. Navigate to the Players page
2. Click the star icon on any player card to star/unstar them
3. Starred players will automatically appear at the top of the list
4. Stars are saved per team per season
5. Starred players also appear at the top in:
   - Regular auction rounds (bidding page)
   - Bulk auction rounds (selection page)

### In Auction Rounds
Starred players automatically appear at the top of player lists in:
- **Regular Rounds**: When placing bids, your starred players show first
- **Bulk Rounds**: When selecting players, your starred players show first
- This helps teams quickly find and bid on their priority targets

## Migration

Run the migration script:
```bash
psql -d your_database -f scripts/add-starred-players.sql
```

## Future Enhancements
- Add star limit per team (e.g., max 20 starred players)
- Add bulk star/unstar functionality
- Show starred count in UI
- Add starred players filter
- Export/import starred players list
