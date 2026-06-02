# eFootball Context Update for News Generation

## Overview
Updated the news generation system to properly reflect that TFC League is an **eFootball (virtual football game) tournament** where each team is controlled by ONE manager/player.

## Changes Made

### 1. AI Prompts Updated (`lib/news/prompts-bilingual.ts`)

#### English Prompt
Added context section explaining:
- This is an eFootball tournament, not real-life football
- Each team (Man United, Barcelona, etc.) is controlled by ONE manager/player
- Teams compete in eFootball matches (virtual football simulation)
- Managers build squads through player auctions
- Write about teams/matches as eFootball/gaming competition
- Refer to "managers" not "coaches" or "real-life players"
- If manager names are provided in metadata, mention them in articles

#### Malayalam Prompt
Added equivalent context in Malayalam explaining the eFootball nature of the tournament.

### 2. Tournament Context Enhanced (`lib/news/tournament-context.ts`)

Added manager information to the context object:
```typescript
team: {
  name: teamStanding.seasonTeam.team.name,
  manager: teamStanding.seasonTeam.managerName || 'Unknown Manager'
}
```

Updated the narrative generation to include manager context at the beginning:
```typescript
parts.push(`Team: ${context.team.name} (Manager: ${context.team.manager})`);
```

### 3. Match Completion Handler Updated (`app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts`)

Added manager names to the metadata sent to news generation:
```typescript
metadata: {
  home_team: existingMatch.homeTeam.team.name,
  away_team: existingMatch.awayTeam.team.name,
  home_manager: existingMatch.homeTeam.managerName || 'Unknown Manager',
  away_manager: existingMatch.awayTeam.managerName || 'Unknown Manager',
  // ... other fields
}
```

### 4. Manual News Generation Script Updated (`scripts/generate-match-news.ts`)

Added manager names to metadata for manual news generation testing:
```typescript
metadata: {
  home_team: match.homeTeam.team.name,
  away_team: match.awayTeam.team.name,
  home_manager: match.homeTeam.managerName || 'Unknown Manager',
  away_manager: match.awayTeam.managerName || 'Unknown Manager',
  // ... other fields
}
```

## Database Schema

The `season_teams` table already has a `managerName` field:
```prisma
model season_teams {
  id           String   @id
  seasonId     String
  teamId       String
  managerName  String?  // Manager name for the team
  // ... other fields
}
```

## How It Works

1. **Match Completion**: When a match is completed, the system fetches both teams' data including manager names
2. **Context Generation**: Tournament context now includes the team name and manager name
3. **AI Prompts**: The AI is explicitly told this is an eFootball tournament with one manager per team
4. **News Articles**: Generated articles will:
   - Understand the eFootball/virtual football context
   - Reference managers (not coaches)
   - Treat matches as gaming competition
   - Include manager names when writing about teams

## Example Context Passed to AI

```
Team: Manchester United (Manager: John Smith)
Tournament: 3 of 10 matches played (30% complete)
Currently 2nd in TFC League with 7 points from 3 matches
3 matches remaining
Recent form: good (WDL)
Scoring 1.7 goals per match in last 3 games (5 scored, 4 conceded)
5 points behind leader Liverpool
```

## Testing

To test the updated news generation:

```bash
# Generate news for a specific match
npm run news:generate TFCMA-XXXX

# The generated news should now:
# 1. Mention manager names
# 2. Treat it as eFootball/gaming context
# 3. Use "manager" terminology instead of "coach"
```

## Impact

- **More Accurate**: News articles now correctly reflect the eFootball nature of the league
- **Better Context**: Manager names provide personal connection to teams
- **Appropriate Terminology**: Uses gaming/eFootball language instead of real football
- **Richer Stories**: AI can write about manager vs manager battles, not coach vs coach

## Files Modified

1. `lib/news/prompts-bilingual.ts` - AI prompt context
2. `lib/news/tournament-context.ts` - Tournament context fetching
3. `app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts` - Match completion handler
4. `scripts/generate-match-news.ts` - Manual news generation script

## Next Steps

All changes are complete. The next match completion will automatically use the updated context and generate news articles that:
- Understand the eFootball context
- Include manager names
- Use appropriate gaming terminology
- Treat teams as managed by individual players
