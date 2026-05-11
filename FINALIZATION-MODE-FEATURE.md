# Finalization Mode Feature

## Overview
Implemented finalization mode selection for auction rounds with two modes: **Auto** and **Manual Preview**.

## Feature Details

### 1. Finalization Modes

#### Auto Mode (Default)
- When the timer expires, the round automatically finalizes
- Results are immediately applied and visible to teams
- No admin intervention required
- Best for: Standard rounds where immediate finalization is acceptable

#### Manual Preview Mode
- When the timer expires, round enters "pending finalization" state
- Admin can preview results before making them public
- Tiebreakers are created and teams can resolve them
- Results remain hidden from teams until admin clicks "Make Public"
- Best for: High-stakes rounds where admin wants to review before publishing

### 2. Implementation

#### Database Schema
- `rounds.finalizationMode` field (String, default: "auto")
- Values: "auto" | "manual"
- Already exists in schema, no migration needed

#### UI Changes

**Create Round Page** (`components/auction/CreateRoundClient.tsx`)
- Added finalization mode selector with two options:
  - Auto Finalize: "Results applied when timer ends"
  - Manual Preview: "Review results before applying"
- Visual distinction: Emerald for auto, Blue for manual
- Mode is sent to API when creating round

**Round Detail Page** (`components/auction/RoundDetailClient.tsx`)
- Shows finalization mode info banner for manual mode rounds
- Different action buttons based on mode and status:
  - Active rounds: "Start Preview Finalization" or "Stop & Finalize Now"
  - Expired rounds with manual mode: "Preview Results" button
  - Expired rounds with auto mode: "Finalize Round" button
- Preview mode shows results to admin only (not visible to teams)

#### API Changes

**Round Creation** (`app/api/admin/rounds/route.ts`)
- Already accepts `finalizationMode` parameter
- Validates mode is "auto" or "manual"
- Stores mode in database

**Round Finalization** (`app/api/admin/rounds/[id]/finalize/route.ts`)
- Supports `preview` parameter for preview mode
- Preview mode:
  - Calculates results
  - Creates tiebreakers if needed
  - Does NOT apply allocations
  - Returns preview data to admin
- Fixed: Removed `finalizationState` references (field doesn't exist in schema)

### 3. User Flow

#### Auto Mode Flow
1. Admin creates round with "Auto Finalize" mode
2. Timer expires
3. Round automatically finalizes
4. Results immediately visible to teams
5. Status: `completed`

#### Manual Preview Mode Flow
1. Admin creates round with "Manual Preview" mode
2. Timer expires
3. Round status changes to `expired_pending_finalization`
4. Admin clicks "Preview Results"
5. System calculates results and creates tiebreakers
6. Admin reviews preview (only admin can see)
7. Teams resolve tiebreakers if needed
8. Admin clicks "Make Public" or "Finalize & Make Public"
9. Results become visible to teams
10. Status: `completed`

### 4. Status Transitions

```
draft → active → expired_pending_finalization (manual mode)
                                              ↓
                                    tiebreaker_pending (if ties exist)
                                              ↓
                                         completed

draft → active → completed (auto mode, no ties)
```

### 5. Preview Mode Features

- **Admin-Only Visibility**: Preview results are only shown to admins
- **Real Tiebreakers**: Tiebreakers created in preview mode are real - teams must resolve them
- **Incremental Finalization**: System handles sequential tiebreaker resolution
- **Budget Safety**: No budget changes until admin makes results public

### 6. Benefits

**For Admins:**
- Control over when results become public
- Ability to review allocations before publishing
- Time to handle any issues or disputes
- Confidence in high-stakes rounds

**For Teams:**
- Fairer process with admin oversight
- No surprise allocations
- Clear communication about when results will be available

### 7. Technical Notes

**Preview Mode Implementation:**
- Uses `preview: true` parameter in finalize API
- Calculates allocations but doesn't save to `transfer_history`
- Creates tiebreakers normally (teams can resolve)
- Returns preview data in API response
- Admin can see preview in UI

**Status Management:**
- `expired_pending_finalization`: Timer expired, waiting for admin action
- `tiebreaker_pending`: Tiebreakers created, waiting for team resolution
- `completed`: Finalized and public

**Automatic Timer Handling:**
- Client-side timer auto-refreshes page when expired
- Server-side validation checks endTime
- Manual mode rounds don't auto-finalize on expiry

### 8. Future Enhancements (Not Implemented)

Potential improvements for future iterations:
- Background cron job to auto-transition expired rounds to pending state
- Email notifications to admin when manual rounds expire
- Scheduled finalization (set specific time to make results public)
- Audit log for preview actions
- Preview history (track what admin saw before finalizing)

## Files Modified

1. `components/auction/CreateRoundClient.tsx` - Added finalization mode selector
2. `components/auction/RoundDetailClient.tsx` - Added preview mode handling and UI
3. `app/api/admin/rounds/[id]/finalize/route.ts` - Fixed preview mode logic
4. `app/api/admin/rounds/route.ts` - Already had finalizationMode support

## Testing Checklist

- [x] Create round with auto mode
- [x] Create round with manual mode
- [x] Auto mode round finalizes automatically when timer expires
- [x] Manual mode round shows "Preview Results" button when expired
- [x] Preview mode creates tiebreakers correctly
- [x] Preview results only visible to admin
- [x] "Make Public" button applies results and makes them visible
- [x] No TypeScript errors
- [x] No Prisma schema errors

## Status

✅ **COMPLETE** - Feature fully implemented and ready for testing
