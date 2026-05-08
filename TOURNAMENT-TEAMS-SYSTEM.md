# Tournament Teams System

## Overview
The `tournament_teams` table establishes a direct relationship between tournaments and participating teams, allowing teams to be registered before matches are created.

## Database Schema

### tournament_teams Table
```sql
CREATE TABLE tournament_teams (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    group_name TEXT,              -- For group stage tournaments
    seed_position INTEGER,         -- For seeding/ordering
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    UNIQUE(tournament_id, team_id)
);
```

## Benefits

### Before (Match-Based)
- ❌ Teams only visible after matches created
- ❌ No way to pre-register teams
- ❌ Can't show tournament participants before fixtures
- ❌ Complex queries to extract unique teams

### After (Direct Relationship)
- ✅ Register teams when creating tournament
- ✅ Show participating teams immediately
- ✅ Support for group assignments
- ✅ Support for seeding positions
- ✅ Cleaner, more efficient queries

## Usage Examples

### 1. Register Teams to Tournament
```typescript
// When creating a tournament, add teams
await prisma.tournament_teams.createMany({
  data: [
    {
      id: 'tt-1',
      tournamentId: 'tournament-001',
      teamId: 'team-001',
      seedPosition: 1
    },
    {
      id: 'tt-2',
      tournamentId: 'tournament-001',
      teamId: 'team-002',
      seedPosition: 2
    }
  ]
})
```

### 2. Assign Teams to Groups
```typescript
// For group stage tournaments
await prisma.tournament_teams.update({
  where: { id: 'tt-1' },
  data: { groupName: 'Group A' }
})
```

### 3. Fetch Tournament Teams
```typescript
const tournament = await prisma.tournaments.findUnique({
  where: { id: tournamentId },
  include: {
    tournamentTeams: {
      include: {
        seasonTeam: {
          include: { team: true }
        }
      },
      orderBy: { seedPosition: 'asc' }
    }
  }
})
```

### 4. Get Teams by Group
```typescript
const groupATeams = await prisma.tournament_teams.findMany({
  where: {
    tournamentId: 'tournament-001',
    groupName: 'Group A'
  },
  include: {
    seasonTeam: {
      include: { team: true }
    }
  }
})
```

## Migration Notes

### Running the Migration
```bash
# Apply the migration
psql -U your_user -d your_database -f prisma/migrations/add_tournament_teams.sql

# Regenerate Prisma client
npx prisma generate
```

### Data Migration
The migration automatically:
1. Creates the `tournament_teams` table
2. Extracts existing teams from matches
3. Populates `tournament_teams` with historical data
4. Assigns group names for group stage tournaments

### Backward Compatibility
- Existing matches remain unchanged
- All current functionality continues to work
- New features can be added incrementally

## Tournament Types & Team Management

### LEAGUE_ONLY / LEAGUE_PLAYOFF
- All teams registered at tournament level
- No group assignments needed
- Use `seedPosition` for initial standings order

### GROUP_KNOCKOUT
- Teams assigned to groups via `groupName`
- Each group has its own standings
- Top teams from each group advance

### KNOCKOUT_ONLY
- Teams registered with `seedPosition` for bracket seeding
- No group assignments
- Seeding determines initial matchups

## API Integration

### Admin: Add Teams to Tournament
```typescript
// POST /api/tournaments/[tournamentId]/teams
{
  "teamIds": ["team-001", "team-002", "team-003"],
  "groupAssignments": {
    "team-001": "Group A",
    "team-002": "Group A",
    "team-003": "Group B"
  }
}
```

### Public: Get Tournament Teams
```typescript
// GET /api/tournaments/[tournamentId]/teams
// Returns teams with tournament-specific stats
```

## Future Enhancements

1. **Team Registration UI**
   - Admin interface to add/remove teams
   - Drag-and-drop group assignments
   - Automatic seeding based on standings

2. **Fixture Generation**
   - Use `tournament_teams` as source for fixture creation
   - Respect group assignments and seeding
   - Validate all teams have matches

3. **Team Validation**
   - Ensure teams belong to tournament's season
   - Check for conflicts (team in multiple tournaments)
   - Validate minimum/maximum team counts

4. **Statistics**
   - Pre-tournament team info
   - Historical tournament participation
   - Team performance across tournaments

## Related Files
- `prisma/schema.prisma` - Schema definition
- `prisma/migrations/add_tournament_teams.sql` - Migration script
- `app/(public)/tournaments/[tournamentId]/teams/page.tsx` - Public teams page
- `app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx` - Admin tournament page
