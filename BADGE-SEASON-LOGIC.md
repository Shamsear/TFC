# Badge Season Logic - Explained

## Summary
**YES**, badges can be earned again in different seasons, but it depends on the badge type.

## How It Works

### Database Constraint
```prisma
@@unique([teamId, badgeKey, seasonId])
```

This means:
- A team can have the **same badge multiple times** if earned in **different seasons**
- A team **cannot** have the same badge twice in the **same season**

### Badge Types

#### 1. Season-Specific Badges (Can be earned every season)
These badges are tied to a specific season and can be earned again in new seasons:

- **IRON_CURTAIN** - Clean sheet (seasonId from match's tournament)
- **GOLDEN_INVINCIBLES** - Unbeaten tournament (seasonId from tournament)
- **GOLDEN_BOOT** - Most goals in tournament (seasonId from tournament)
- **GOLDEN_GLOVE** - Fewest goals conceded (seasonId from tournament)

**Example:**
- Team wins Golden Boot in Season 1 → Badge awarded with `seasonId: "TFCS-1"`
- Team wins Golden Boot in Season 2 → Badge awarded again with `seasonId: "TFCS-2"`
- Both badges exist in database, both show in achievements

#### 2. Career/Lifetime Badges (One-time only)
These badges have `seasonId: null` and can only be earned once across all seasons:

**Match Performance:**
- SQUEAKY_BUM_TIME - Win by 1 goal
- SLEEPING_PILLS - 0-0 draw
- PERFECT_BALANCE - Draw with 2+ goals
- HIGHSCORE_THRILLER - Win despite conceding 3+
- DEMOLITION_JOB - Win by 4+ goals
- GALE_FORCE - Score 5+ goals
- THE_ENTERTAINERS - 6+ total goals in match
- APEX_PREDATOR - Win 4-0 or better
- FLAWLESS_VICTORY - Win 3-0 or better

**Streaks:**
- UNSTOPPABLE_1/2/3 - Win streaks (3, 5, 8 games)
- INVINCIBLE_1/2/3 - Unbeaten streaks (5, 10, 15 games)

**Special Achievements:**
- GUARD_DOG - Concede max 1 goal in 5 matches
- DOUBLE_JEOPARDY - Beat same opponent twice
- RESILIENT_SPIRIT - Win after losing by 3+ goals
- GIANT_KILLER - Bottom-half team beats top-3 team
- STREAK_BUSTER - Beat team on win streak
- GOAL_BARON - 50+ career goals
- CENTURION - 100+ career goals

## Duplicate Prevention Logic

```typescript
// Check if badge already exists for this team + season combination
const isDuplicate = (award: any) => {
  return existingBadges.some(
    (eb: any) => eb.badgeKey === award.key && eb.seasonId === award.seasonId
  );
};
```

## Examples

### Scenario 1: Season-Specific Badge
```
Season 1: Team wins Golden Boot
→ Badge: { badgeKey: "GOLDEN_BOOT", seasonId: "TFCS-1" }

Season 2: Same team wins Golden Boot again
→ Badge: { badgeKey: "GOLDEN_BOOT", seasonId: "TFCS-2" }

Result: Team has 2 Golden Boot badges (one per season) ✅
```

### Scenario 2: Career Badge
```
Season 1: Team scores 5 goals in a match
→ Badge: { badgeKey: "GALE_FORCE", seasonId: null }

Season 2: Team scores 5 goals in a match again
→ Duplicate check: Badge already exists with seasonId: null
→ Badge NOT awarded again ❌

Result: Team has 1 Gale Force badge (lifetime) ✅
```

### Scenario 3: Same Badge, Same Season
```
Season 1, Match 1: Team gets clean sheet
→ Badge: { badgeKey: "IRON_CURTAIN", seasonId: "TFCS-1" }

Season 1, Match 5: Team gets another clean sheet
→ Duplicate check: Badge already exists for TFCS-1
→ Badge NOT awarded again ❌

Result: Team has 1 Iron Curtain badge for Season 1 ✅
```

## XP Rewards

- Badge XP is only awarded **once** when the badge is first unlocked
- If a badge is earned again in a new season, the team gets the XP again
- Career badges (seasonId: null) only give XP once ever

## UI Display

In the achievements page:
- All badges (both season-specific and career) are shown
- Season-specific badges can appear multiple times (once per season earned)
- Career badges appear only once
- The unlock date shows when each badge was earned

## Summary Table

| Badge Type | seasonId | Can Earn Again? | XP Awarded |
|------------|----------|-----------------|------------|
| Season-Specific | Tournament/Season ID | Yes, in new seasons | Yes, each time |
| Career/Lifetime | null | No, once ever | Once only |

## Code Location

- Badge awarding logic: `lib/achievements-engine.ts`
- Duplicate prevention: Lines 383-387, 398-402
- Database schema: `prisma/schema.prisma` (team_badges model)
