# Advanced Tournament Configuration - Implementation Complete

## Overview
The tournament system now supports advanced configuration for leagues, playoffs, groups, and knockout rounds with granular control over match formats and team qualification.

## Completed Features

### 1. Advanced Tournament Configuration Form
**File**: `components/tournament/TournamentFormAdvanced.tsx`

**League Settings**:
- Choice between single (1 leg) or double (2 legs) round-robin
- Playoff format options:
  - Top 2 → Direct to Semi Final
  - Top 4 → Semi Final (1v4, 2v3)
  - Top 8 → Quarter Final (full bracket)
  - Top 2 Direct + 3-6 Playoff (3v6, 4v5 winners to semis)

**Group Stage Settings**:
- Number of groups (2-8)
- Single or double round-robin within groups
- Top 2, 3, or 4 teams qualify per group

**Knockout Settings**:
- Default format: single leg or two legs (home & away)
- Can be customized per round when generating

### 2. Database Schema Updates
**File**: `prisma/schema.prisma`

Added configuration fields to `tournaments` table:
- `leagueLegs` (1 or 2)
- `playoffFormat` (TOP_2_SEMI, TOP_4_SEMI, TOP_8_QUARTER, TOP_3_6_PLAYOFF)
- `groupLegs` (1 or 2)
- `groupQualifiers` (2, 3, or 4)
- `knockoutConfig` (JSON for per-round customization)

Added `knockout_rounds` table:
- Round name (ROUND_OF_16, QUARTER_FINAL, SEMI_FINAL, THIRD_PLACE, FINAL)
- Legs per round (1 or 2)
- Status tracking (PENDING, IN_PROGRESS, COMPLETED)

Added `knockout_pairings` table:
- Team matchups
- Winner tracking
- Match references (leg1, leg2)

Added relation between `standings` and `season_teams`

### 3. Knockout Round Management
**File**: `components/tournament/KnockoutRoundManager.tsx`
- Create individual knockout rounds with custom settings
- Select teams from league/group standings
- Quick select top N teams based on position
- Choose between automatic or manual pairing
- Configure legs per round (1 or 2)
- Prevents duplicate rounds

**File**: `components/tournament/KnockoutBracket.tsx`
- Visual bracket display for all knockout rounds
- Edit team pairings after creation
- View match links (leg 1 and leg 2)
- Winner highlighting
- Color-coded rounds

### 4. Updated Fixture Generator
**File**: `components/tournament/FixtureGenerator.tsx`
- Respects `leagueLegs` configuration from tournament
- Respects `groupLegs` configuration for group stage
- Displays format information (single/double round-robin)
- Shows group qualification rules

### 5. API Routes

**Created**:
- `POST /api/seasons/[seasonId]/tournaments/[tournamentId]/knockout` - Create knockout round
- `GET /api/seasons/[seasonId]/tournaments/[tournamentId]/knockout` - List knockout rounds
- `PATCH /api/seasons/[seasonId]/tournaments/[tournamentId]/knockout/pairings/[pairingId]` - Update pairing

**Updated**:
- `POST /api/seasons/[seasonId]/tournaments` - Now handles advanced configuration fields

### 6. Tournament Detail Page
**File**: `app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx`
- Added knockout rounds to data fetching
- Includes pairings and counts

**File**: `components/tournament/TournamentTabs.tsx`
- Added "Knockout" tab for applicable tournament types
- Fetches knockout rounds dynamically
- Passes available teams with standings data

## How It Works

### Creating a Tournament
1. Admin selects tournament type (League Only, League+Playoff, Group+Knockout, Knockout Only)
2. Based on type, relevant configuration options appear:
   - **League**: Choose 1 or 2 legs, select playoff format if applicable
   - **Group**: Set number of groups, legs, and qualifiers
   - **Knockout**: Set default legs (can be customized per round)
3. Select participating teams
4. Tournament is created with configuration stored

### Generating Fixtures
1. For **League/Group**: Fixtures are auto-generated based on `leagueLegs` or `groupLegs`
2. System creates appropriate number of matches (single or double round-robin)
3. Dates are assigned based on matches per week

### Creating Knockout Rounds
1. Navigate to tournament detail → Knockout tab
2. Select round type (Round of 16, Quarter Final, Semi Final, Final, Third Place)
3. Choose legs for this specific round (1 or 2)
4. Select teams:
   - Quick select top N teams from standings
   - Or manually select teams
5. Choose pairing method:
   - **Automatic**: 1 vs last, 2 vs second-last, etc.
   - **Manual**: Customize after creation
6. Round is created with pairings

### Editing Knockout Pairings
1. View bracket in Knockout tab
2. Click "Edit Teams" on any pairing
3. Select different teams from dropdowns
4. Save changes

## Files Modified/Created

### Created:
- `components/tournament/TournamentFormAdvanced.tsx`
- `components/tournament/KnockoutRoundManager.tsx`
- `components/tournament/KnockoutBracket.tsx`
- `app/api/seasons/[seasonId]/tournaments/[tournamentId]/knockout/route.ts`
- `app/api/seasons/[seasonId]/tournaments/[tournamentId]/knockout/pairings/[pairingId]/route.ts`
- `prisma/migrations/add_standings_team_relation.sql`

### Modified:
- `prisma/schema.prisma` - Added advanced config fields and knockout tables
- `app/(admin)/sub-admin/[seasonId]/tournaments/new/page.tsx` - Uses TournamentFormAdvanced
- `app/api/seasons/[seasonId]/tournaments/route.ts` - Handles advanced config
- `components/tournament/FixtureGenerator.tsx` - Respects leg configuration
- `components/tournament/TournamentTabs.tsx` - Added knockout tab
- `app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx` - Fetches knockout data

## Database Schema Summary

```prisma
tournaments {
  leagueLegs      Int?    // 1 or 2
  playoffFormat   String? // TOP_2_SEMI, TOP_4_SEMI, etc.
  groupLegs       Int?    // 1 or 2
  groupQualifiers Int?    // 2, 3, or 4
  knockoutConfig  String? // JSON config
}

knockout_rounds {
  roundName  String      // QUARTER_FINAL, SEMI_FINAL, etc.
  roundOrder Int
  legs       Int         // 1 or 2
  status     RoundStatus // PENDING, IN_PROGRESS, COMPLETED
}

knockout_pairings {
  team1Id     String?
  team2Id     String?
  winnerId    String?
  leg1MatchId String?
  leg2MatchId String?
}
```

## Status: ✅ COMPLETE

All advanced configuration features are implemented and functional. The system provides granular control over league formats, playoff structures, group configurations, and individual knockout round management.
