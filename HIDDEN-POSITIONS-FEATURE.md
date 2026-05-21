# Hidden Positions Feature

## Overview
This feature allows admins to create auction calendar entries with hidden positions that are revealed later. Teams will see "???" instead of the actual position until the admin reveals it.

## Implementation Details

### 1. Database Changes
**File:** `scripts/add-position-hidden-column.sql`

Added `position_hidden` column to:
- `rounds` table (BOOLEAN, default false)
- `auction_slots` table (BOOLEAN, default false)

**To apply:**
```bash
psql -d your_database < scripts/add-position-hidden-column.sql
```

### 2. Calendar Creation UI
**File:** `app/(admin)/sub-admin/[seasonId]/calendar/new/page.tsx`

**Changes:**
- Added `positionHidden` field to `PositionSlot` interface
- Added checkbox toggle "Hide Position (Mystery Round)" in the Slot Builder
- Updated all `addSlot()` calls to pass `positionHidden` parameter
- Visual indicators show "???" for hidden positions in preview
- Labels show "(Hidden)" status for mystery rounds

**Features:**
- Checkbox appears after Round Type selection
- Clear description: "Position will be hidden from teams until you reveal it later"
- Hidden positions display with reduced opacity and "???" placeholder
- Works for both Normal and Bulk rounds

### 3. API Updates
**File:** `app/api/seasons/[seasonId]/calendar/bulk/route.ts`

**Changes:**
- Updated slot creation to include `positionHidden` field
- Field is stored in database when creating auction slots

### 4. Public Calendar Display
**File:** `components/calendar/CalendarView.tsx`

**Changes:**
- Updated `Auction` interface to include `positionHidden` field
- Display logic shows "???" instead of position name when hidden
- Group suffixes (A/B) are hidden for mystery positions
- Visual styling: reduced opacity + "(Hidden)" label
- Works in all views: Month, List, and Mobile

**Display Examples:**
- Normal position: `CB-A (Normal)`
- Hidden position: `??? (Normal • Hidden)`
- Bulk hidden: `??? (Bulk • Hidden)`

## Usage Flow

### For Admins:
1. Go to Calendar → Add Auction Date
2. Select Round Type (Normal or Bulk)
3. Check "Hide Position (Mystery Round)" checkbox
4. Add positions as usual
5. Positions will show as "???" in calendar
6. Later, admin can reveal positions (feature to be added)

### For Teams:
1. View calendar and see "???" for mystery rounds
2. Cannot see actual position until revealed
3. Adds excitement and strategy to auction planning

## Future Enhancements

### Position Reveal Interface (To Be Implemented)
Create an admin interface to reveal hidden positions:

**Location:** `app/(admin)/sub-admin/[seasonId]/calendar/[calendarId]/reveal/page.tsx`

**Features:**
- List all hidden positions for a calendar entry
- Button to reveal individual positions
- Bulk reveal all positions
- Update `positionHidden` to `false` in database
- Emit notifications to teams when positions are revealed

**API Endpoint:** `app/api/seasons/[seasonId]/calendar/[calendarId]/reveal/route.ts`

```typescript
// Pseudo-code for reveal endpoint
POST /api/seasons/[seasonId]/calendar/[calendarId]/reveal
Body: { slotIds: string[] }

// Update auction_slots
UPDATE auction_slots 
SET "positionHidden" = false 
WHERE id IN (slotIds)

// Optionally notify teams via SSE or push notifications
```

### Additional Features:
1. **Scheduled Reveals:** Auto-reveal positions at specific times
2. **Partial Reveals:** Reveal positions gradually (e.g., one per day)
3. **Team Notifications:** Alert teams when positions are revealed
4. **Reveal History:** Track when positions were revealed and by whom
5. **Preview Mode:** Allow admins to preview what teams see

## Testing Checklist

- [ ] Run SQL migration successfully
- [ ] Create calendar entry with hidden position
- [ ] Verify "???" shows in calendar view (public)
- [ ] Verify "???" shows in team calendar view
- [ ] Verify hidden positions work for Normal rounds
- [ ] Verify hidden positions work for Bulk rounds
- [ ] Verify position groups are hidden correctly
- [ ] Test mobile calendar view
- [ ] Test desktop month view
- [ ] Test desktop list view
- [ ] Verify audit logs are created
- [ ] Test with multiple hidden positions
- [ ] Test mixed hidden/visible positions

## Files Modified

1. `scripts/add-position-hidden-column.sql` (NEW)
2. `app/(admin)/sub-admin/[seasonId]/calendar/new/page.tsx`
3. `app/api/seasons/[seasonId]/calendar/bulk/route.ts`
4. `components/calendar/CalendarView.tsx`

## Database Schema

```sql
-- auction_slots table
CREATE TABLE auction_slots (
  id TEXT PRIMARY KEY,
  "auctionCalendarId" TEXT NOT NULL,
  position TEXT NOT NULL,
  position_group TEXT DEFAULT 'ALL',
  "roundType" TEXT DEFAULT 'normal',
  "positionHidden" BOOLEAN NOT NULL DEFAULT false,  -- NEW
  "slotOrder" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("auctionCalendarId") REFERENCES auction_calendar(id)
);

-- rounds table
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  position TEXT,
  position_hidden BOOLEAN NOT NULL DEFAULT false,  -- NEW
  round_number INTEGER NOT NULL,
  -- ... other fields
);
```

## Notes

- Hidden positions are stored in the database but marked with a flag
- The actual position data is preserved for admin reference
- Teams cannot see the position until the flag is changed
- This feature adds strategic depth to the auction process
- Admins maintain full control over when to reveal positions
