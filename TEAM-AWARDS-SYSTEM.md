# Team Awards System

## Overview
The Team Awards System allows admins to save and track "Team of the Day" and "Team of the Week" awards for tournament participants. These awards highlight the best performing teams in specific time periods.

## Database Schema

### Table: `team_awards`
Stores team awards for tournaments.

**Columns:**
- `id` (TEXT, PK): Unique identifier (TFCTA-XXX format)
- `tournament_id` (TEXT, FK): References tournaments(id)
- `season_team_id` (TEXT, FK): References season_teams(id)
- `award_type` (TeamAwardType): Either 'TEAM_OF_THE_DAY' or 'TEAM_OF_THE_WEEK'
- `award_period` (TEXT): Human-readable period (e.g., "Matchday 5" or "Week 2 (MD 8-14)")
- `matchday_number` (INT, nullable): Matchday number for Team of the Day
- `week_number` (INT, nullable): Week number for Team of the Week
- `points_earned` (INT): Points earned during the period
- `goals_for` (INT): Goals scored
- `goals_against` (INT): Goals conceded
- `goal_difference` (INT): Goal difference
- `matches_played` (INT): Number of matches in the period
- `wins` (INT): Number of wins
- `draws` (INT): Number of draws
- `losses` (INT): Number of losses
- `created_at` (TIMESTAMP): Creation timestamp
- `updated_at` (TIMESTAMP): Update timestamp

**Constraints:**
- Unique constraint on (tournament_id, award_type, award_period) to prevent duplicates
- Foreign keys with CASCADE delete

**Indexes:**
- tournament_id
- season_team_id
- award_type
- Composite: (tournament_id, award_type, award_period)

### Enum: `TeamAwardType`
```typescript
enum TeamAwardType {
  TEAM_OF_THE_DAY
  TEAM_OF_THE_WEEK
}
```

## API Endpoints

### GET /api/tournaments/[tournamentId]/team-awards
Fetch all team awards for a tournament.

**Response:**
```json
[
  {
    "id": "TFCTA-001",
    "tournamentId": "TFCT-1",
    "awardType": "TEAM_OF_THE_DAY",
    "awardPeriod": "Matchday 5",
    "matchdayNumber": 5,
    "pointsEarned": 3,
    "goalsFor": 4,
    "goalsAgainst": 1,
    "seasonTeam": {
      "team": {
        "name": "Arsenal",
        "logoUrl": "..."
      }
    }
  }
]
```

### POST /api/tournaments/[tournamentId]/team-awards
Save a new team award.

**Request Body:**
```json
{
  "seasonTeamId": "TFCST-123",
  "awardType": "TEAM_OF_THE_DAY",
  "awardPeriod": "Matchday 5",
  "matchdayNumber": 5,
  "pointsEarned": 3,
  "goalsFor": 4,
  "goalsAgainst": 1,
  "goalDifference": 3,
  "matchesPlayed": 1,
  "wins": 1,
  "draws": 0,
  "losses": 0
}
```

**Response:** 201 Created with award object

**Error Responses:**
- 401: Unauthorized (not admin)
- 409: Award already exists for this period
- 400: Missing required fields

### DELETE /api/tournaments/[tournamentId]/team-awards?awardId=xxx
Delete a team award.

**Response:** 200 OK with { success: true }

## UI Integration

### Poster Studio
Located in `components/tournaments/StatsPoster.tsx`

**Features:**
1. **Team of the Day Poster**: Shows the best team for a specific matchday
2. **Team of the Week Poster**: Shows the best team for a week range (e.g., Matchdays 1-7)
3. **Save Award Button**: Appears only for team_matchday and team_weekly themes
   - Disabled if no matchday/week selected
   - Shows loading state during save
   - Shows success/error feedback
   - Prevents duplicate saves

**Props Required:**
- `tournamentId`: Tournament identifier
- `seasonId`: Season identifier
- `teams`: Team statistics data
- `matches`: Match data for calculations

### Usage Example
```tsx
<StatsPoster
  teams={teamsData}
  tournamentName="Premier League"
  seasonName="2023-24"
  roundLabel="Matchday 10"
  activeAward="golden-ball"
  imageTeamsLimit="5"
  matches={matchesData}
  tournamentId="TFCT-123"
  seasonId="TFCS-456"
/>
```

## Award Calculation Logic

### Team of the Day
- Filters matches for a specific matchday
- Calculates team performance for that single matchday
- Ranks by: Points → Goal Difference → Goals For

### Team of the Week
- Groups matchdays into weeks of 7 (1-7, 8-14, 15-21, etc.)
- Aggregates team performance across all matchdays in the week
- Ranks by: Points → Goal Difference → Goals For

## Migration Instructions

1. **Run the SQL migration:**
   ```bash
   psql $DATABASE_URL -f scripts/add-team-awards-table.sql
   ```

2. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Verify the schema:**
   ```sql
   \d team_awards
   SELECT * FROM team_awards LIMIT 5;
   ```

## Features

✅ Save Team of the Day awards for specific matchdays
✅ Save Team of the Week awards for week ranges
✅ Prevent duplicate awards for the same period
✅ Track detailed performance statistics
✅ Admin-only access (SUPER_ADMIN and SUB_ADMIN)
✅ Automatic best team calculation
✅ Visual feedback (loading, success, error states)
✅ Integration with existing poster studio

## Future Enhancements

- Display saved awards on team profile pages
- Award history timeline view
- Award notifications to team managers
- Leaderboard for most awards won
- Export award certificates/images
- Public awards gallery page
