# Knockout Tournament Complete Guide

## Overview
This guide explains how knockout tournaments work in the system, covering both automatic (auto) and manual creation modes, tournament types, configuration, and the complete workflow.

---

## Tournament Types That Support Knockout

The system supports multiple tournament types that include knockout stages:

### 1. **KNOCKOUT_ONLY**
- Pure knockout bracket tournament
- No league or group stage
- Teams directly enter knockout rounds
- Simple elimination format

### 2. **GROUP_KNOCKOUT**
- Group stage followed by knockout rounds
- Teams qualify from groups based on position
- Automatic pairing rules based on group standings
- Example: UEFA Champions League format

### 3. **LEAGUE_PLAYOFF**
- League stage followed by playoff knockout rounds
- Top teams from league qualify for playoffs
- Multiple playoff formats available
- Example: NBA Playoffs format

### 4. **CUSTOM_KNOCKOUT**
- Advanced configuration for flexible knockout entry
- Define qualifying team count and entry round
- Customize which round teams enter (e.g., 4 teams enter at Semi Finals)
- Full control over bracket structure

---

## Knockout Creation Modes

### **Auto Qualification Mode** (Automatic)
Creates knockout rounds with placeholder-based automatic team pairing and qualification.

**When to Use:**
- Preceding stage (group/league) is not yet completed
- Want system to automatically pair teams based on rules
- Need brackets created in advance with placeholders

**How It Works:**
1. System creates bracket with placeholders (e.g., "Group A #1", "League #3")
2. As group/league matches complete, placeholders auto-resolve to actual teams
3. Pairings follow predefined qualification rules
4. No manual team selection needed

**Advantages:**
- Can create full bracket structure before matches finish
- Teams populate automatically as they qualify
- Follows standard tournament progression rules
- Reduces admin work

**Example Placeholder Pairings:**
```
Quarter Finals (8 teams from 4 groups with 2 qualifiers each):
- Match #1: Group A #1 vs Group B #2
- Match #2: Group C #1 vs Group D #2  
- Match #3: Group B #1 vs Group A #2
- Match #4: Group D #1 vs Group C #2
```

---

### **Manual Selection Mode**
Manually select participating teams and customize pairing structure.

**When to Use:**
- Preceding stage is completed
- Need custom team selection (not following standard rules)
- Want specific matchup arrangements
- Creating invitational or special format tournaments

**How It Works:**
1. Admin manually selects exactly the required number of teams
2. Choose pairing method (automatic seeding or consecutive)
3. Can create custom matchups if needed
4. Teams must be selected before round creation

**Requirements:**
- Preceding stage (group/league) must be completed
- Must select exact number of teams for the round
- Teams must have final positions/standings

**Pairing Methods:**

1. **Automatic Seeding (1 vs Last)**
   - Top seed plays bottom seed
   - 2nd seed plays 2nd-last seed
   - Standard tournament seeding
   - Example: 1v8, 2v7, 3v6, 4v5

2. **Consecutive Pairing (1 vs 2)**
   - Teams paired in order selected
   - 1v2, 3v4, 5v6, 7v8
   - Used for custom arrangements

3. **Custom Matchups**
   - Fully manual pairing configuration
   - Select each matchup individually
   - Complete control over bracket structure

---

## Knockout Configuration Fields

### Tournament-Level Settings

#### `knockoutConfig` (JSON)
Stores knockout configuration at tournament level:

```json
{
  "defaultLegs": 2,
  "qualifyingTeams": 4,
  "qualifyingRound": "SEMI_FINAL"
}
```

**Fields:**
- `defaultLegs`: Default number of legs per round (1 or 2)
- `qualifyingTeams`: For CUSTOM_KNOCKOUT, how many teams qualify
- `qualifyingRound`: For CUSTOM_KNOCKOUT, which round teams enter

#### Tournament Type Settings

**GROUP_KNOCKOUT:**
- `numGroups`: Number of groups (2-8)
- `groupLegs`: Group stage format (1=single, 2=double round-robin)
- `groupQualifiers`: Teams that qualify per group (2, 3, or 4)
- `knockoutLegs`: Default knockout format (1=single leg, 2=two legs)

**LEAGUE_PLAYOFF:**
- `leagueLegs`: League format (1=single, 2=double round-robin)
- `playoffFormat`: Options include:
  - `TOP_2_SEMI`: Top 2 to semi finals
  - `TOP_4_SEMI`: Top 4 to semi finals (1v4, 2v3)
  - `TOP_8_QUARTER`: Top 8 to quarter finals
  - `TOP_3_6_PLAYOFF`: Top 2 direct to semis, 3-6 playoff for remaining spots
- `knockoutLegs`: Default knockout format

**KNOCKOUT_ONLY:**
- `knockoutLegs`: Default knockout format (1 or 2 legs)
- No group or league settings

**CUSTOM_KNOCKOUT:**
- `qualifyingTeams`: Number of teams entering knockout (e.g., 4, 8, 16)
- `qualifyingRound`: Entry point round (e.g., SEMI_FINAL, QUARTER_FINAL)
- `knockoutLegs`: Default leg format

---

## Database Schema

### `knockout_rounds` Table
Stores individual knockout round information:

```sql
CREATE TABLE knockout_rounds (
  id            TEXT PRIMARY KEY,
  tournamentId  TEXT NOT NULL REFERENCES tournaments(id),
  roundName     TEXT NOT NULL,  -- ROUND_OF_32, ROUND_OF_16, QUARTER_FINAL, etc.
  roundOrder    INT NOT NULL,   -- 0, 1, 2, 3, 4, 5
  legs          INT NOT NULL,   -- 1 or 2
  status        TEXT NOT NULL,  -- PENDING, IN_PROGRESS, COMPLETED
  createdAt     TIMESTAMP DEFAULT NOW(),
  updatedAt     TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tournamentId, roundName)
);
```

**Round Names and Order:**
- `ROUND_OF_32` (order: 0) - 16 pairings
- `ROUND_OF_16` (order: 1) - 8 pairings
- `QUARTER_FINAL` (order: 2) - 4 pairings
- `SEMI_FINAL` (order: 3) - 2 pairings
- `THIRD_PLACE` (order: 4) - 1 pairing
- `FINAL` (order: 5) - 1 pairing

### `knockout_pairings` Table
Stores team matchups for each round:

```sql
CREATE TABLE knockout_pairings (
  id                TEXT PRIMARY KEY,
  knockoutRoundId   TEXT NOT NULL REFERENCES knockout_rounds(id),
  team1Id           TEXT,
  team2Id           TEXT,
  team1Placeholder  TEXT,  -- "Group A #1", "League #3", etc.
  team2Placeholder  TEXT,
  winnerId          TEXT,
  leg1MatchId       TEXT,
  leg2MatchId       TEXT,
  createdAt         TIMESTAMP DEFAULT NOW(),
  updatedAt         TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `team1Id/team2Id`: Actual team IDs (null if using placeholders)
- `team1Placeholder/team2Placeholder`: Text placeholders for auto mode
- `winnerId`: ID of winning team after matches complete
- `leg1MatchId/leg2MatchId`: Links to actual match records

---

## Auto Qualification Rules

### GROUP_KNOCKOUT Pairing Logic

#### Quarter Finals (8 teams)

**Option 1: 4 Groups with 2 Qualifiers Each**
```
Match #1: Group A #1 vs Group B #2
Match #2: Group C #1 vs Group D #2
Match #3: Group B #1 vs Group A #2
Match #4: Group D #1 vs Group C #2
```

**Option 2: 2 Groups with 4 Qualifiers Each**
```
Match #1: Group A #1 vs Group B #4
Match #2: Group A #2 vs Group B #3
Match #3: Group B #2 vs Group A #3
Match #4: Group B #1 vs Group A #4
```

#### Semi Finals (4 teams)

**Option 1: 2 Groups with 2 Qualifiers Each**
```
Match #1: Group A #1 vs Group B #2
Match #2: Group B #1 vs Group A #2
```

**Option 2: 4 Groups with 1 Winner Each**
```
Match #1: Group A Winner vs Group B Winner
Match #2: Group C Winner vs Group D Winner
```

#### Finals (2 teams)
```
Match #1: Group A Winner vs Group B Winner
```

### LEAGUE_PLAYOFF Pairing Logic

#### Semi Finals (4 teams)
```
Match #1: League #1 vs League #4
Match #2: League #2 vs League #3
```

#### Finals (2 teams)
```
Match #1: League #1 vs League #2
```

### Fallback for KNOCKOUT_ONLY or Unmatched Cases
```
Seed-based pairing:
Match #1: Seed #1 vs Seed #[last]
Match #2: Seed #2 vs Seed #[second-last]
...
```

---

## Creating Knockout Rounds - Step by Step

### Step 1: Navigate to Tournament
1. Go to Sub-Admin Dashboard
2. Select Season
3. Click on Tournament
4. Navigate to "Knockout" tab

### Step 2: Choose Creation Mode

**For Auto Qualification:**
1. Click "Auto Qualification" mode
2. System shows placeholders based on tournament type
3. Placeholders auto-populate when matches complete
4. Can create even if preceding stage incomplete

**For Manual Selection:**
1. Click "Manual Selection" mode
2. Requires preceding stage to be completed
3. Must manually select teams

### Step 3: Select Round Type
Choose from available rounds:
- Round of 32 (32 teams)
- Round of 16 (16 teams)
- Quarter Final (8 teams)
- Semi Final (4 teams)
- Third Place (2 teams)
- Final (2 teams)

**Note:** Only rounds valid for your tournament configuration will be available.

### Step 4: Configure Round Settings

**Legs Per Round:**
- Single Leg: One match decides winner
- Two Legs: Home and away matches (aggregate score)

**Create Full Bracket Option:**
- Enable to auto-generate all subsequent rounds
- Example: Creating Quarter Finals also creates Semi Finals and Final
- All rounds use same leg configuration

### Step 5: Team Selection (Manual Mode Only)

**Quick Select Options:**
- "Top 4 Teams" - Select top 4 by position
- "Top 8 Teams" - Select top 8 by position
- Manual checkbox selection

**Pairing Method:**
- Automatic: 1v8, 2v7, 3v6, 4v5
- Consecutive: 1v2, 3v4, 5v6, 7v8
- Custom: Define each matchup individually

### Step 6: Preview Pairings
System shows preview of all matchups:
- Team logos and names (if resolved)
- Placeholder text (if auto mode or unresolved)
- Match numbering

### Step 7: Create Round
Click "Create Knockout Round" button to finalize.

**Auto Mode:** Bracket created with placeholders, auto-resolves as matches complete

**Manual Mode:** Bracket created with selected teams, matches can be scheduled immediately

---

## Full Bracket Generation

### How It Works
When "Create Full Bracket" is enabled:

1. **Primary Round**: Created with your selected configuration
2. **Subsequent Rounds**: Auto-generated in progression order

**Example: Creating Quarter Finals**
System creates:
- ✅ Quarter Final (4 pairings)
- ✅ Semi Final (2 pairings) 
- ✅ Final (1 pairing)

All rounds use the same leg configuration (single or two-legged).

### Placeholder Chaining
Subsequent rounds automatically reference previous rounds:

```
Semi Final Match #1: 
  - Winner of Quarter Final Match #1
  - Winner of Quarter Final Match #2

Semi Final Match #2:
  - Winner of Quarter Final Match #3
  - Winner of Quarter Final Match #4

Final:
  - Winner of Semi Final Match #1
  - Winner of Semi Final Match #2
```

### Auto-Resolution Process
As matches complete:
1. System identifies winner of each knockout pairing
2. Populates `winnerId` field in pairing record
3. Searches for pairings in next round referencing this match
4. Replaces placeholder with actual winning team ID
5. Process repeats for each round progression

---

## Bracket Management Features

### Viewing Bracket
**Visual Bracket Display:**
- All rounds shown in order
- Color-coded by round type
- Shows team names/logos or placeholders
- Indicates winners with highlight
- Links to match pages (when scheduled)

### Editing Pairings
**Manual Pairing Updates:**
1. Click "Edit Teams" on any pairing
2. Use searchable dropdowns to select teams
3. Click "Save" to update pairing
4. System validates team availability

**Use Cases:**
- Fix incorrect auto-pairings
- Handle special qualification scenarios
- Accommodate tournament rule changes
- Manual overrides when needed

### Reset Bracket
**Complete Bracket Reset:**
1. Click "Reset Bracket" button
2. Confirm deletion warning
3. Deletes all knockout rounds and pairings
4. Deletes all associated matches
5. Reverts tournament status to IN_PROGRESS

**Warning:** This action is permanent and cannot be undone.

---

## Match Scheduling After Knockout Creation

### For Two-Legged Ties
Each pairing gets:
- Leg 1 Match (Team 1 home)
- Leg 2 Match (Team 2 home)

### Accessing Matches
From bracket view:
- "Leg 1" button links to first match
- "Leg 2" button links to second match
- Admin can set dates, enter results

### Winner Determination
**Single Leg:**
- Team with higher score wins
- Extra time/penalties for draws

**Two Legs:**
- Aggregate score determines winner
- Away goals rule (if configured)
- Extra time/penalties in second leg if tied

---

## API Endpoints

### Create Knockout Round
```
POST /api/seasons/{seasonId}/tournaments/{tournamentId}/knockout
```

**Request Body:**
```json
{
  "roundName": "QUARTER_FINAL",
  "legs": 2,
  "teams": ["team_id_1", "team_id_2", ...],  // Empty array for auto mode
  "autoPair": true,  // For manual mode seeding
  "customPairings": [],  // For custom matchups
  "createFullBracket": true  // Generate subsequent rounds
}
```

**Response:**
```json
{
  "id": "kr_abc123",
  "tournamentId": "tournament_id",
  "roundName": "QUARTER_FINAL",
  "roundOrder": 2,
  "legs": 2,
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Get Knockout Rounds
```
GET /api/seasons/{seasonId}/tournaments/{tournamentId}/knockout
```

**Response:**
```json
[
  {
    "id": "kr_abc123",
    "roundName": "QUARTER_FINAL",
    "roundOrder": 2,
    "legs": 2,
    "status": "PENDING",
    "pairings": [
      {
        "id": "kp_xyz789",
        "team1Id": "team_1",
        "team2Id": null,
        "team1Placeholder": null,
        "team2Placeholder": "Group A #2",
        "winnerId": null,
        "leg1MatchId": null,
        "leg2MatchId": null
      }
    ],
    "_count": { "pairings": 4 }
  }
]
```

### Update Pairing
```
PATCH /api/seasons/{seasonId}/tournaments/{tournamentId}/knockout/pairings/{pairingId}
```

**Request Body:**
```json
{
  "team1Id": "team_abc",
  "team2Id": "team_def"
}
```

### Delete All Knockout Rounds
```
DELETE /api/seasons/{seasonId}/tournaments/{tournamentId}/knockout
```

Removes all knockout rounds, pairings, and associated matches for the tournament.

---

## Advanced Scenarios

### Scenario 1: World Cup Style (Group + Knockout)
**Configuration:**
- Tournament Type: GROUP_KNOCKOUT
- 4 groups with 4 teams each
- Top 2 qualify per group (8 teams total)
- Two-legged knockout rounds

**Creation Process:**
1. Create tournament with GROUP_KNOCKOUT type
2. Set numGroups = 4, groupQualifiers = 2
3. Assign teams to groups (16 total)
4. Generate group stage fixtures
5. Complete group matches
6. Navigate to Knockout tab
7. Select "Auto Qualification" mode
8. Choose "Round of 16" or "Quarter Final" as starting round
9. System auto-pairs based on group standings
10. Create with "Full Bracket" enabled

### Scenario 2: NBA Playoff Style (League + Playoff)
**Configuration:**
- Tournament Type: LEAGUE_PLAYOFF
- 8-team league
- Top 4 advance to playoffs
- Playoff Format: TOP_4_SEMI

**Creation Process:**
1. Create tournament with LEAGUE_PLAYOFF type
2. Set playoffFormat = TOP_4_SEMI
3. Complete league stage
4. Navigate to Knockout tab
5. Select "Auto Qualification" mode
6. Choose "Semi Final"
7. System auto-pairs: 1v4, 2v3
8. Create with "Full Bracket" enabled (adds Final)

### Scenario 3: FA Cup Style (Pure Knockout)
**Configuration:**
- Tournament Type: KNOCKOUT_ONLY
- Single-leg knockout
- Random draw or seeded bracket

**Creation Process:**
1. Create tournament with KNOCKOUT_ONLY type
2. Set knockoutLegs = 1 (single leg)
3. Navigate to Knockout tab
4. Select "Manual Selection" mode
5. Choose starting round (e.g., Round of 16)
6. Select 16 teams
7. Choose pairing method (auto seeding or custom)
8. Create with "Full Bracket" enabled

### Scenario 4: Custom Entry Point
**Configuration:**
- Tournament Type: CUSTOM_KNOCKOUT
- 4 teams enter at Semi Finals
- Single-leg semi finals, two-leg final

**Creation Process:**
1. Create tournament with CUSTOM_KNOCKOUT type
2. Set qualifyingTeams = 4
3. Set qualifyingRound = SEMI_FINAL
4. Complete preceding qualification tournament
5. Navigate to Knockout tab
6. Create Semi Finals (4 teams) with legs = 1
7. Create Final manually with legs = 2

---

## Troubleshooting

### Issue: "Cannot create round: preceding stage incomplete"
**Cause:** Manual mode selected but group/league stage not finished

**Solution:**
- Switch to "Auto Qualification" mode, or
- Complete all group/league matches first

### Issue: "This knockout round already exists"
**Cause:** Round with same name already created

**Solution:**
- Edit existing round via bracket view, or
- Reset entire bracket and recreate, or
- Skip to next round in progression

### Issue: Teams not auto-populating in brackets
**Cause:** Matches incomplete or tournament linking not configured

**Solution:**
- Complete all qualifying matches
- Verify tournament status is not COMPLETED
- Check that group/league standings are finalized
- Run manual bracket resolution if needed

### Issue: Wrong teams paired in auto mode
**Cause:** Incorrect group assignments or standings

**Solution:**
- Verify team group assignments are correct
- Recalculate standings
- Use "Edit Teams" to manually correct pairings

### Issue: Can't delete knockout rounds
**Cause:** Matches already scheduled or in progress

**Solution:**
- Use "Reset Bracket" to delete all at once
- Manually delete associated matches first
- Or complete the tournament and start new

---

## Best Practices

### 1. Plan Tournament Structure Early
- Decide on tournament type before team assignment
- Configure all settings (legs, qualifiers) upfront
- Use AUTO mode for standard progression rules

### 2. Use Full Bracket Generation
- Enables "Create Full Bracket" for efficiency
- Ensures consistent leg configuration
- Reduces manual setup time

### 3. Leverage Auto Qualification
- Create brackets before preceding stage completes
- Let system handle team population automatically
- Reduces admin intervention

### 4. Test with Small Tournaments
- Start with simple knockout structures
- Verify pairing logic with test data
- Scale up to complex multi-stage tournaments

### 5. Document Custom Rules
- For CUSTOM_KNOCKOUT or special formats
- Keep notes on qualification criteria
- Share with participants clearly

### 6. Monitor Bracket Resolution
- Check that placeholders resolve correctly
- Verify winner progression between rounds
- Fix any issues before scheduling matches

---

## Summary

The knockout tournament system provides:

✅ **Flexible Creation**: Auto and manual modes for different scenarios  
✅ **Multiple Tournament Types**: Pure knockout, group+knockout, league+playoff, custom  
✅ **Automatic Pairing**: Smart placeholder-based qualification rules  
✅ **Full Bracket Generation**: Create entire tournament structure at once  
✅ **Visual Management**: Interactive bracket view with editing  
✅ **Dynamic Resolution**: Teams auto-populate as they qualify  
✅ **Comprehensive Configuration**: Control legs, qualifiers, entry points  

The system handles everything from simple single-elimination tournaments to complex multi-stage competitions like the FIFA World Cup or UEFA Champions League.
