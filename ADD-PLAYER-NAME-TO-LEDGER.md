# Add Player Name to Financial Ledger

## Summary
Added `playerName` field to the `financial_ledger` table to store player names when recording player purchase transactions.

## Changes Made

### 1. Schema Update
**File:** `prisma/schema.prisma`
- Added `playerName String?` field to the `financial_ledger` model

### 2. Code Updates

#### Regular Round Finalization
**File:** `lib/auction/finalize-round.ts`
- Modified to collect player names per team during allocation processing
- Updated financial ledger creation to include concatenated player names (comma-separated for multiple players)

#### Bulk Round Finalization
**File:** `lib/auction/finalize-bulk-round.ts`
- Modified to collect player names per team during allocation processing
- Updated financial ledger creation to include concatenated player names (comma-separated for multiple players)

#### Tiebreaker Finalization
**File:** `lib/auction/tiebreaker.ts`
- Added `basePlayer.name` to the tiebreaker query
- Updated financial ledger creation to include the player name

#### Bulk Tiebreaker Finalization
**File:** `lib/auction/finalize-bulk-tiebreaker.ts`
- Added `basePlayer.name` to the bulk tiebreaker query
- Updated financial ledger creation to include the player name

#### Auction API Route
**File:** `app/api/seasons/[seasonId]/auction/route.ts`
- Updated financial ledger creation to include `playerName: basePlayer.name`

#### Sell Player API Route
**File:** `app/api/seasons/[seasonId]/auction/sell/route.ts`
- Updated financial ledger creation to include `playerName: player?.name || null`

### 3. Migration Script
**File:** `scripts/add-player-name-to-ledger.sql`
- SQL script to add the `playerName` column to existing database

## Database Migration Required

Run the following command to apply the schema changes:

```bash
npx prisma migrate dev --name add_player_name_to_financial_ledger
```

Or manually run the SQL script:

```sql
ALTER TABLE financial_ledger ADD COLUMN playerName TEXT;
```

## Behavior

- For single player purchases: `playerName` contains the player's name
- For multiple player purchases in one round: `playerName` contains comma-separated player names (e.g., "John Doe, Jane Smith")
- For non-player transactions (INITIAL_PURSE, etc.): `playerName` is NULL

## Testing

After migration, verify:
1. New player purchases save the player name correctly
2. Round finalizations with multiple players show all player names
3. Tiebreaker resolutions include the player name
4. Existing ledger entries have NULL for playerName (expected)
