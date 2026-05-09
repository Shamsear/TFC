# Season Number Feature - Implementation Complete

## Overview
Added a `seasonNumber` field to allow manual control of season IDs. The season ID is now generated as `TFCS-{seasonNumber}` instead of auto-incrementing.

---

## Changes Made

### 1. Database Schema Update
**File**: `prisma/schema.prisma`

**Added field**:
```prisma
model seasons {
  id                   String                  @id
  seasonNumber         Int                     @unique  // NEW FIELD
  name                 String                  @unique
  startingPurse        Int
  isActive             Boolean                 @default(false)
  // ... rest of fields
}
```

### 2. Migration Script
**File**: `scripts/add-season-number.sql`

**Run this SQL in your database**:
```sql
-- Add the column
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "season_number" INTEGER;

-- Update existing seasons with sequential numbers
WITH numbered_seasons AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM seasons
)
UPDATE seasons
SET season_number = numbered_seasons.rn
FROM numbered_seasons
WHERE seasons.id = numbered_seasons.id;

-- Make it NOT NULL and UNIQUE
ALTER TABLE "seasons" ALTER COLUMN "season_number" SET NOT NULL;
ALTER TABLE "seasons" ADD CONSTRAINT IF NOT EXISTS "seasons_season_number_key" UNIQUE ("season_number");
```

### 3. API Route Update
**File**: `app/api/seasons/route.ts`

**Changes**:
- Added `seasonNumber` validation
- Check for duplicate season numbers
- Generate ID as `TFCS-{seasonNumber}` instead of auto-increment
- Return error if season number already exists

**New validation**:
```typescript
if (!seasonNumber || typeof seasonNumber !== "number" || seasonNumber < 1) {
  return NextResponse.json(
    { error: "Season number is required and must be a positive number" },
    { status: 400 }
  )
}

// Check if season number already exists
const existingSeasonWithNumber = await prisma.seasons.findUnique({
  where: { seasonNumber }
})

if (existingSeasonWithNumber) {
  return NextResponse.json(
    { error: `Season number ${seasonNumber} is already in use.` },
    { status: 409 }
  )
}

// Generate ID based on season number
const seasonId = `TFCS-${seasonNumber}`
```

### 4. Season Creation Form Update
**File**: `app/(admin)/super-admin/seasons/new/page.tsx`

**Added field**:
- Season Number input (required, positive integer)
- Shows preview: `TFCS-{seasonNumber}`
- Validates season number before submission

**Form fields**:
1. Season Number (e.g., 1, 2, 3, 4)
2. Season Name (e.g., "Season 4", "Winter Cup 2026")
3. Starting Purse (e.g., 1000000)

---

## How It Works

### Creating a Season

**Example 1: Create Season 4**
```
Season Number: 4
Season Name: Season 4
Starting Purse: 1000000

Result:
- ID: TFCS-4
- Season Number: 4
- Name: Season 4
```

**Example 2: Create Season 1**
```
Season Number: 1
Season Name: Season 1
Starting Purse: 1000000

Result:
- ID: TFCS-1
- Season Number: 1
- Name: Season 1
```

**Example 3: Create Custom Season**
```
Season Number: 10
Season Name: Winter Cup 2026
Starting Purse: 2000000

Result:
- ID: TFCS-10
- Season Number: 10
- Name: Winter Cup 2026
```

### Validation Rules

1. **Season Number is required** - Must provide a number
2. **Must be positive** - Season number must be >= 1
3. **Must be unique** - Cannot reuse a season number
4. **Season Name is unique** - Cannot reuse a season name

### Error Handling

**Duplicate Season Number**:
```
Error: Season number 4 is already in use. Please choose a different number.
```

**Duplicate Season Name**:
```
Error: A season with this name already exists. Please choose a different name.
```

**Invalid Season Number**:
```
Error: Season number is required and must be a positive number
```

---

## Migration Steps

### Step 1: Run SQL Migration
Execute the SQL script in your database:
```bash
# Copy the SQL from scripts/add-season-number.sql
# Run it in your database console or pgAdmin
```

Or if database is accessible:
```bash
npx prisma migrate dev --name add_season_number
```

### Step 2: Restart Dev Server
```bash
# Stop the server (Ctrl + C)
npm run dev
```

### Step 3: Test Season Creation
1. Login as super admin (`admin@tfc.com` / `admin123`)
2. Navigate to `/super-admin/seasons/new`
3. Fill in:
   - Season Number: `4`
   - Season Name: `Season 4`
   - Starting Purse: `1000000`
4. Click "Create Season"
5. Verify ID is `TFCS-4`

---

## Benefits

✅ **Manual Control**: Choose your own season numbers
✅ **Predictable IDs**: Know the ID before creating (TFCS-{number})
✅ **Flexible Naming**: Season name independent of number
✅ **No Gaps**: Can create TFCS-1, TFCS-2, TFCS-10 in any order
✅ **Validation**: Prevents duplicate season numbers
✅ **Preview**: See the ID before creating

---

## Examples

### Scenario 1: Sequential Seasons
```
Create Season 1 → TFCS-1
Create Season 2 → TFCS-2
Create Season 3 → TFCS-3
Create Season 4 → TFCS-4
```

### Scenario 2: Skip Numbers
```
Create Season 1 → TFCS-1
Create Season 5 → TFCS-5
Create Season 10 → TFCS-10
```

### Scenario 3: Out of Order
```
Create Season 10 → TFCS-10
Create Season 1 → TFCS-1
Create Season 5 → TFCS-5
```

### Scenario 4: Custom Names
```
Season Number: 1, Name: "Inaugural Season" → TFCS-1
Season Number: 2, Name: "Winter Cup 2026" → TFCS-2
Season Number: 3, Name: "Champions League" → TFCS-3
```

---

## Database State After Migration

### Existing Seasons (if any)
Existing seasons will be assigned sequential numbers based on creation date:
- First created season → season_number = 1, id stays the same
- Second created season → season_number = 2, id stays the same
- etc.

### New Seasons
New seasons will use the provided season number for the ID:
- Season Number: 4 → ID: TFCS-4

---

## Status

✅ **Schema Updated**: Added `seasonNumber` field
✅ **Migration Created**: SQL script ready to run
✅ **API Updated**: Validates and uses season number
✅ **Form Updated**: Added season number input field
✅ **Preview Added**: Shows ID before creation
✅ **Validation Added**: Prevents duplicates

⏳ **Pending**: Run SQL migration in database
🎯 **Ready**: Create seasons with custom numbers

---

## Next Steps

1. **Run the migration**: Execute `scripts/add-season-number.sql` in your database
2. **Restart dev server**: Stop and start `npm run dev`
3. **Test**: Create a season with number 4 and verify ID is `TFCS-4`
4. **Delete old season**: If `TFCS-1` exists with wrong data, delete it first
