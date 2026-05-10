# Auction Settings Implementation

## Summary
Added season-level auction settings that are used as defaults for all rounds, eliminating the need to configure these values for each round individually.

## Changes Made

### 1. Database Schema Update

**Added to `seasons` table:**
```sql
ALTER TABLE seasons
ADD COLUMN IF NOT EXISTS "defaultMaxBidsPerTeam" INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS "defaultBasePrice" INTEGER DEFAULT 100000;
```

**Fields:**
- `defaultMaxBidsPerTeam` - Default maximum bids per team (default: 10, or number of participating teams)
- `defaultBasePrice` - Default minimum starting price for players (default: 100,000)

### 2. Prisma Schema Updated

```prisma
model seasons {
  // ... existing fields
  defaultMaxBidsPerTeam   Int?     @default(10) @map("defaultMaxBidsPerTeam")
  defaultBasePrice        Int?     @default(100000) @map("defaultBasePrice")
  // ... rest of fields
}
```

### 3. Create Round Page Updated

**Server Component** (`app/(admin)/sub-admin/[seasonId]/auction-v2/create/page.tsx`):
- Fetches `defaultMaxBidsPerTeam` and `defaultBasePrice` from season
- Calculates `maxBidsPerTeam` as: `season.defaultMaxBidsPerTeam || numberOfTeams`
- Passes defaults to client component

**Client Component** (`components/auction-v2/CreateRoundClient.tsx`):
- Receives `seasonDefaults` prop
- Uses season defaults when creating rounds
- No need for manual input of these values

## How It Works

### Automatic Calculation:
1. **maxBidsPerTeam**: 
   - Uses `season.defaultMaxBidsPerTeam` if set
   - Falls back to number of participating teams
   - Ensures teams can bid on all available slots

2. **basePrice**:
   - Uses `season.defaultBasePrice` if set
   - Falls back to 100,000
   - Consistent minimum price across all rounds

### Round Creation Flow:
```
1. Admin selects auction date & position
2. System fetches season defaults
3. Round created with:
   - maxBidsPerTeam = season default or team count
   - basePrice = season default (100,000)
   - durationSeconds = calculated from hours + minutes
   - position = from selected slot
   - playerIds = all eligible players for position
```

## Migration Steps

### Step 1: Run SQL Migration
```bash
# Option 1: Using psql
psql -U your_username -d your_database -f prisma/migrations/add_auction_settings_to_seasons.sql

# Option 2: Using database client (pgAdmin, DBeaver, etc.)
# Run the SQL from: prisma/migrations/add_auction_settings_to_seasons.sql
```

### Step 2: Generate Prisma Client
```bash
# Stop dev server first
npx prisma generate
```

### Step 3: Restart Dev Server
```bash
npm run dev
```

## Benefits

### 1. Consistency
- All rounds in a season use the same auction rules
- No need to remember settings for each round

### 2. Simplicity
- Fewer fields to fill when creating rounds
- Settings configured once at season level

### 3. Flexibility
- Can still override per round if needed (future enhancement)
- Defaults can be updated for the season

### 4. Smart Defaults
- `maxBidsPerTeam` automatically matches team count
- Prevents configuration errors

## Future Enhancements

### Season Settings Page
Create a dedicated settings page at `/sub-admin/[seasonId]/settings` to configure:
- Default max bids per team
- Default base price
- Default round duration
- Auction rules and policies

### Per-Round Overrides
Add optional fields to round creation form:
- Override max bids per team
- Override base price
- Custom rules for special rounds

## Files Modified

1. **`prisma/schema.prisma`** - Added auction settings fields to seasons model
2. **`prisma/migrations/add_auction_settings_to_seasons.sql`** - Migration script
3. **`app/(admin)/sub-admin/[seasonId]/auction-v2/create/page.tsx`** - Fetch and pass defaults
4. **`components/auction-v2/CreateRoundClient.tsx`** - Use season defaults

## Testing

### Verify Migration:
```sql
SELECT 
  id, 
  name, 
  "defaultMaxBidsPerTeam", 
  "defaultBasePrice"
FROM seasons;
```

### Expected Results:
- Existing seasons: NULL or default values (10, 100000)
- New seasons: Can set custom defaults
- Rounds: Use season defaults automatically

---

**Status**: ✅ Code Complete (Migration pending)
**Next Step**: Run SQL migration and generate Prisma client
**Date**: May 10, 2026
