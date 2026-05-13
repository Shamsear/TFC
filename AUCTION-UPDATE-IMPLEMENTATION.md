# Auction Update Implementation Summary

## Overview
Implemented the min/max squad size system for the auction as specified in `auction_update.md`. This adds a three-phase budget management system with mandatory minimum and optional maximum squad sizes.

## Changes Made

### 1. Database Schema (`scripts/add-min-max-squad-size.sql`)
Created migration script to:
- Create `auction_settings` table with phase configuration and min/max squad size
- Add `football_min_slots` and `football_max_slots` columns to `teams` table
- Add constraints to ensure max >= min
- Insert default settings for existing seasons
- Default values: min=25, max=30

### 2. Squad Size Validator (`lib/squad-size-validator.ts`)
New utility module for validating squad size constraints:
- `validateSquadSizeForRound()` - Validates proposed selections against min/max limits
- `getSquadSizeInfo()` - Returns squad size information for display
- Checks both team-specific and season-level squad limits
- Returns detailed validation results with error messages

### 3. Advanced Reserve Calculator (`lib/auction/reserve-calculator-v2.ts`)
Implements three-phase reserve calculation system:

**Phase 1 (Rounds 1-18): Strict Reserve**
- Must maintain reserve for all future rounds
- Reserve = Phase1Remaining×£30 + Phase2Full×£30 + Phase3Slots×£10
- Cannot skip rounds
- Enforces strict limits

**Phase 2 (Rounds 19-20): Soft Reserve with Floor**
- Floor reserve (if skip remaining Phase 2)
- Recommended reserve (if complete Phase 2)
- Can skip rounds if balance < £30
- Warnings for bids exceeding recommended limit

**Phase 3 (Rounds 21-25): Flexible Floor**
- If below min squad: Reserve = SlotsToMin × £10
- If at/above min squad: Reserve = £0 (can spend entire balance)
- Can skip rounds if balance < £10
- No restrictions after reaching minimum squad

Key functions:
- `calculateReserveCore()` - Core calculation logic
- `calculateReserve()` - Fetches data and calculates reserve
- `validateBidAgainstReserve()` - Validates bid against reserve requirements

### 4. Bulk Tiebreaker Balance Checks (`lib/auction/finalize-bulk-tiebreaker.ts`)
Enhanced `placeBulkTiebreakerBid()` function:
- Added balance check from Neon database
- Integrated reserve calculation using `calculateReserveCore()`
- Validates bids against phase-based reserve requirements
- Returns warnings for Phase 2 bids exceeding recommended limits
- Prevents bids that violate reserve requirements

### 5. Bulk Round Selection Validation (`app/api/team/bulk-rounds/[id]/select/route.ts`)
Added squad size validation:
- Validates selections against min/max squad constraints
- Returns detailed error messages with squad info
- Checks if team has reached minimum squad size
- Enforces maximum squad size limit

### 6. Super Admin Season Creation (`app/(admin)/super-admin/seasons/new/page.tsx`)
Added min/max squad size configuration:
- New form fields for minimum and maximum squad size
- Default values: min=25, max=30
- Validation: max must be >= min
- Preview card shows squad size configuration
- Visual grouping with blue/purple gradient section

### 7. Seasons API (`app/api/seasons/route.ts`)
Enhanced season creation:
- Accept `minSquadSize` and `maxSquadSize` parameters
- Validate squad size constraints (max >= min)
- Create `auction_settings` record in Neon database
- Include squad size in audit log details
- Default values if not provided: min=25, max=30

## Key Features

### Min/Max Squad Size System
- **Minimum Squad Size (25)**: Mandatory - teams must reach this
- **Maximum Squad Size (30)**: Optional - teams can acquire up to this limit
- Reserve calculations based on minimum squad size
- After reaching minimum, no reserves needed for optional players

### Phase-Based Reserve Management
- Phase 1: Strict enforcement to ensure minimum squad completion
- Phase 2: Floor enforcement with warnings
- Phase 3: Conditional enforcement until minimum reached, then flexible

### Team-Specific Limits
- Each team can have different min/max squad sizes
- Falls back to season defaults if not set
- Stored in both `teams` table and `auction_settings` table

### Comprehensive Validation
- Frontend validation for better UX
- Backend validation for security
- Detailed error messages explaining constraints
- Squad status information displayed to users

## Database Tables

### auction_settings
```sql
- season_id (unique)
- phase_1_end_round (default: 18)
- phase_1_min_balance (default: 30)
- phase_2_end_round (default: 20)
- phase_2_min_balance (default: 30)
- phase_3_min_balance (default: 10)
- min_squad_size (default: 25)
- max_squad_size (default: 30)
- max_rounds (default: 25)
```

### teams (new columns)
```sql
- football_min_slots (default: 25)
- football_max_slots (default: 30)
```

## Usage

### Running the Migration
```bash
# Connect to your Neon database and run:
psql -U your_username -d your_database -f scripts/add-min-max-squad-size.sql
```

### Creating a Season with Squad Limits
1. Navigate to Super Admin > Seasons > Create New Season
2. Fill in season details
3. Set minimum squad size (default: 25)
4. Set maximum squad size (default: 30)
5. Submit - auction_settings will be created automatically

### Validating Squad Size in Bulk Rounds
The validation happens automatically when teams submit selections:
- Teams below min squad must select enough players to reach minimum
- Teams at/above min squad can select 0 to remaining slots
- Teams cannot exceed maximum squad size

### Checking Reserves for Tiebreaker Bids
Reserve checks happen automatically when placing bids:
- Phase 1: Strict enforcement
- Phase 2: Floor enforcement with warnings
- Phase 3: Conditional based on squad size

## Testing Checklist

- [ ] Run database migration script
- [ ] Create new season with custom min/max squad sizes
- [ ] Verify auction_settings record created
- [ ] Test bulk round selection with various squad sizes
- [ ] Test tiebreaker bids in different phases
- [ ] Verify reserve calculations for each phase
- [ ] Test squad size validation errors
- [ ] Verify teams can skip Phase 2 rounds
- [ ] Verify teams cannot skip Phase 1 rounds
- [ ] Test Phase 3 flexibility after reaching min squad

## Error Messages

### Squad Size Validation
- "You must select exactly X players to reach minimum squad size (25)"
- "Selection would exceed maximum squad size (30)"
- "You can select maximum X players. Your squad: Y/30"

### Reserve Validation
- "Bid exceeds reserve. Phase 1: 13×£30 + Phase 2: 2×£30 + Phase 3: 6×£10 = £510"
- "Bid violates Phase 3 floor reserve. Maximum allowed: £440"
- "⚠️ Bid exceeds recommended limit (£420)"

## Notes

- Reserve calculations use minimum squad size to ensure mandatory completion
- After reaching minimum squad, teams can freely acquire optional players
- Team-specific limits override season defaults
- All validations happen on both frontend and backend
- Auction settings are created automatically when creating a season
- Migration script is idempotent (safe to run multiple times)

## Future Enhancements

Potential improvements not included in this implementation:
- UI component to display reserve information to team managers
- API endpoint to fetch reserve info for a team/round
- Admin interface to edit auction settings after season creation
- Bulk update tool for team-specific squad limits
- Historical reserve calculation reports
- Reserve calculation preview in bid submission UI
