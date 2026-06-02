# News Generation for WALKOVER and VOID Matches

## Summary
Added automatic news generation for matches marked as WALKOVER or VOID status, in addition to the existing COMPLETED status.

## Changes Made

### 1. Match Update Route (`app/api/seasons/[seasonId]/tournaments/[tournamentId]/matches/[matchId]/route.ts`)

**Trigger Condition (Line ~192):**
- **Before:** Only `status === 'COMPLETED'` triggered news
- **After:** Now triggers for `COMPLETED`, `WALKOVER`, or `VOID` statuses

```typescript
const isNewsWorthy = (status === 'COMPLETED' || status === 'WALKOVER' || status === 'VOID') && 
                     existingMatch.status !== status;
```

**Notifications (Lines ~197-225):**
- Updated notification titles and messages to reflect status:
  - COMPLETED: "🏟️ Match Result Published"
  - WALKOVER: "⚠️ Match Walkover"
  - VOID: "🚫 Match Voided"
- Added status indicators in notification body text

**News Generation Logic (Lines ~250-330):**

#### VOID Matches:
- Generates simple administrative news article
- Event type: `'match_voided'`
- Includes reason from notes field
- Does NOT include tournament context or scenario detection
- Exits early without full match analysis

#### WALKOVER Matches:
- Generates full news article with tournament context
- Event type: `'match_walkover'`
- Includes standing updates and form analysis
- Adds metadata: `is_walkover: true`, `walkover_winner`
- DOES update tournament standings (as before)

#### COMPLETED Matches:
- Uses advanced scenario detection system
- Detects special scenarios (title race, comeback, etc.)
- Full tournament context and impact analysis

**Completed Matches Query Update (Line ~280):**
- Now includes both `'COMPLETED'` and `'WALKOVER'` in round completion checks
- Ensures walkovers count for "first match of round" detection

### 2. News Types (`lib/news/types.ts`)

Added two new event types to `NewsEventType`:
```typescript
| 'match_walkover'
| 'match_voided'
```

These automatically categorize as `'match'` category events in the trigger system.

### 3. Event Categorization (`lib/news/trigger.ts`)

No changes needed - existing `match_` prefix logic automatically categorizes:
- `match_walkover` → `'match'` category
- `match_voided` → `'match'` category

## Behavior

### ✅ News WILL be generated for:
1. **COMPLETED** - Full match analysis with scenarios
2. **WALKOVER** - Full match analysis, marked as walkover
3. **VOID** - Simple administrative notice

### ❌ News will NOT be generated for:
- SCHEDULED
- LIVE
- POSTPONED
- CANCELLED
- Updating already completed/walkover/void matches

## AI Content Generation

The bilingual news prompts already handle these events dynamically:
- Metadata includes `is_walkover: true` for walkovers
- Metadata includes `reason` for void matches
- Context string provides tournament standing impact
- Gemini AI generates appropriate content based on event type and metadata

## Example Metadata

### Walkover:
```json
{
  "home_team": "AC Milan",
  "away_team": "Barcelona",
  "home_manager": "John Doe",
  "away_manager": "Jane Smith",
  "home_score": 3,
  "away_score": 0,
  "winner": "AC Milan",
  "tournament_name": "Premier League",
  "is_walkover": true,
  "walkover_winner": "AC Milan"
}
```

### Void:
```json
{
  "home_team": "AC Milan",
  "away_team": "Barcelona",
  "home_manager": "John Doe",
  "away_manager": "Jane Smith",
  "tournament_name": "Premier League",
  "reason": "Administrative decision"
}
```

## Testing

To test:
1. Set a match status to `WALKOVER` with scores
2. Set a match status to `VOID`
3. Check news page for generated articles
4. Verify notifications sent to managers and admins
5. Confirm tournament standings updated (for walkover only)

## Notes

- Walkover matches update standings but don't count goals (existing behavior)
- Void matches don't update standings (existing behavior)
- News generation is async and won't block the API response
- Failed news generation logs warning but doesn't fail the match update
