# Tournament Linking System

## Overview
Implement a system where tournaments can be linked/chained together, allowing teams to automatically populate into subsequent tournaments based on their positions/rankings in previous tournaments.

## Use Cases

### 1. Sequential Tournament Flow
- **Group Stage → Top 8 Playoffs**: Top 8 teams from group stage advance to playoffs
- **Semifinals → Finals**: Winners of two semifinal tournaments meet in finals
- **League → Relegation**: Bottom teams from main league enter relegation tournament
- **Multiple Groups → Knockout**: Winners from Group A, B, C advance to knockout stage

### 2. Position-Based Qualification
- **1st Place**: Champion advances to Champions League
- **2nd-4th Place**: Teams advance to Europa League
- **Bottom 3**: Teams enter relegation playoff
- **Top 2 per Group**: Advance to knockout rounds

## Database Schema Changes

### New Tables

#### 1. `tournament_links`
Links tournaments together and defines qualification rules.

```sql
CREATE TABLE tournament_links (
  id VARCHAR(36) PRIMARY KEY,
  source_tournament_id VARCHAR(36) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  target_tournament_id VARCHAR(36) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL, -- 'TOP_N', 'BOTTOM_N', 'POSITION_RANGE', 'WINNER', 'RUNNER_UP', 'GROUP_POSITION'
  qualification_config JSONB NOT NULL, -- Configuration for how teams qualify
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'ACTIVE', 'COMPLETED'
  teams_populated BOOLEAN DEFAULT FALSE,
  populated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_tournament_id, target_tournament_id)
);

CREATE INDEX idx_tournament_links_source ON tournament_links(source_tournament_id);
CREATE INDEX idx_tournament_links_target ON tournament_links(target_tournament_id);
CREATE INDEX idx_tournament_links_status ON tournament_links(status);
```

#### 2. `tournament_team_qualifications`
Tracks which teams qualified from which position/tournament.

```sql
CREATE TABLE tournament_team_qualifications (
  id VARCHAR(36) PRIMARY KEY,
  tournament_link_id VARCHAR(36) NOT NULL REFERENCES tournament_links(id) ON DELETE CASCADE,
  season_team_id VARCHAR(36) NOT NULL REFERENCES season_teams(id) ON DELETE CASCADE,
  source_tournament_id VARCHAR(36) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  target_tournament_id VARCHAR(36) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  qualification_position INT, -- Position they finished in source tournament
  group_name VARCHAR(100), -- If from a group stage
  qualified_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP, -- When mathematically confirmed (early qualification)
  slot_number INT, -- Which slot in target tournament (for seeding)
  status VARCHAR(20) DEFAULT 'PROVISIONAL', -- 'PROVISIONAL', 'CONFIRMED', 'FINAL'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tournament_link_id, season_team_id)
);

CREATE INDEX idx_tournament_team_qualifications_link ON tournament_team_qualifications(tournament_link_id);
CREATE INDEX idx_tournament_team_qualifications_team ON tournament_team_qualifications(season_team_id);
CREATE INDEX idx_tournament_team_qualifications_source ON tournament_team_qualifications(source_tournament_id);
CREATE INDEX idx_tournament_team_qualifications_target ON tournament_team_qualifications(target_tournament_id);
CREATE INDEX idx_tournament_team_qualifications_status ON tournament_team_qualifications(status);
```

**Status Values:**
- `PROVISIONAL`: Team currently in qualifying position but not mathematically guaranteed
- `CONFIRMED`: Team mathematically clinched position (can't be overtaken)
- `FINAL`: Source tournament complete, final position confirmed

### Updates to Existing Tables

#### `tournaments` table additions
```sql
ALTER TABLE tournaments 
  ADD COLUMN is_linked BOOLEAN DEFAULT FALSE,
  ADD COLUMN requires_qualification BOOLEAN DEFAULT FALSE,
  ADD COLUMN qualification_status VARCHAR(20) DEFAULT 'COMPLETE', -- 'PENDING', 'PARTIAL', 'COMPLETE'
  ADD COLUMN expected_teams INT; -- Expected number of teams (for validation)
```

## Link Types and Configuration

### 1. TOP_N (Top N Teams)
Teams from top N positions advance.

**Configuration:**
```json
{
  "count": 8,
  "groupBy": null,  // null = overall standings, "group" = per group
  "seedMapping": [1, 2, 3, 4, 5, 6, 7, 8]  // Optional: maps source position to target seed
}
```

**Example:** Top 8 teams from league → Playoff tournament

### 2. BOTTOM_N (Bottom N Teams)
Teams from bottom N positions enter next tournament.

**Configuration:**
```json
{
  "count": 4,
  "groupBy": null
}
```

**Example:** Bottom 4 teams → Relegation tournament

### 3. POSITION_RANGE (Specific Position Range)
Teams within a specific position range qualify.

**Configuration:**
```json
{
  "startPosition": 2,
  "endPosition": 5,
  "groupBy": null
}
```

**Example:** Teams finishing 2nd-5th → Europa League tournament

### 4. WINNER (Tournament Winner Only)
Only the tournament winner advances.

**Configuration:**
```json
{
  "position": 1,
  "slotNumber": 1  // Which slot in target tournament
}
```

**Example:** Tournament A winner → Finals position 1

### 5. RUNNER_UP (Second Place)
Only the runner-up advances.

**Configuration:**
```json
{
  "position": 2,
  "slotNumber": 2
}
```

**Example:** Tournament B runner-up → Finals position 2

### 6. GROUP_POSITION (Position within each group)
Specific position from each group qualifies.

**Configuration:**
```json
{
  "position": 1,  // 1st place from each group
  "groupNames": ["Group A", "Group B", "Group C", "Group D"],
  "seedMapping": {
    "Group A": 1,
    "Group B": 2,
    "Group C": 3,
    "Group D": 4
  }
}
```

**Example:** Winners of each group → Knockout tournament with seeding

### 7. MULTIPLE_POSITIONS_PER_GROUP
Multiple positions from each group advance.

**Configuration:**
```json
{
  "positionsPerGroup": [1, 2],  // 1st and 2nd from each group
  "groupNames": ["Group A", "Group B"],
  "seedMapping": [1, 3, 2, 4]  // [G1-1st, G2-1st, G1-2nd, G2-2nd]
}
```

**Example:** Top 2 from each group → Semifinals

## API Endpoints

### Admin Endpoints

#### 1. Create Tournament Link
```typescript
POST /api/admin/tournaments/links

{
  "sourceTournamentId": "uuid",
  "targetTournamentId": "uuid",
  "linkType": "TOP_N",
  "qualificationConfig": {
    "count": 8,
    "seedMapping": [1, 2, 3, 4, 5, 6, 7, 8]
  }
}
```

#### 2. Get Tournament Links
```typescript
GET /api/admin/tournaments/{tournamentId}/links
// Returns both incoming and outgoing links
```

#### 3. Update Tournament Link
```typescript
PUT /api/admin/tournaments/links/{linkId}

{
  "qualificationConfig": {
    "count": 10  // Changed from 8 to 10
  }
}
```

#### 4. Delete Tournament Link
```typescript
DELETE /api/admin/tournaments/links/{linkId}
```

#### 5. Populate Tournament Teams (Manual Trigger)
```typescript
POST /api/admin/tournaments/links/{linkId}/populate

// Manually trigger team population even if source tournament isn't complete
{
  "force": true  // Force population even if conditions not met
}
```

#### 6. Preview Qualified Teams
```typescript
GET /api/admin/tournaments/links/{linkId}/preview

// Returns which teams would qualify based on current standings
// Useful before tournament is complete
```

#### 7. Clear Populated Teams
```typescript
POST /api/admin/tournaments/links/{linkId}/clear

// Remove teams from target tournament (for resetting)
```

## Automatic Population Logic

### Trigger Conditions

1. **Early/Guaranteed Qualification (Auto-Populate)**
   - Team's position is **mathematically guaranteed** regardless of remaining matches
   - Example: Team in 1st with 60 points, 2nd place has 45 points, only 3 matches left (9 points max)
   - Team is **confirmed** and auto-populated immediately
   - Happens progressively as teams clinch positions

2. **Source Tournament Completed**
   - When tournament status changes to 'COMPLETED'
   - All matches finalized
   - All remaining positions populated

3. **Manual Trigger**
   - Admin can manually trigger population at any time
   - Useful for:
     - Testing
     - Pre-creating tournaments with provisional qualifiers
     - Populating after-the-fact
   - Can force population even if positions not mathematically confirmed

### Guaranteed Qualification Check

**Mathematical Certainty Algorithm:**

```typescript
async function checkGuaranteedQualifications(
  tournamentId: string,
  linkId: string
): Promise<ConfirmedTeam[]> {
  const link = await getTournamentLink(linkId);
  const standings = await getCurrentStandings(tournamentId);
  const remainingMatches = await getRemainingMatches(tournamentId);
  
  const confirmedTeams: ConfirmedTeam[] = [];
  
  // Calculate maximum points each team can achieve
  const maxPossiblePoints = standings.map(team => ({
    teamId: team.teamId,
    currentPoints: team.points,
    remainingGames: remainingMatches.filter(m => 
      m.homeTeamId === team.teamId || m.awayTeamId === team.teamId
    ).length,
    maxPoints: team.points + (remainingGames * 3), // 3 points per win
    currentPosition: team.position
  }));
  
  // Check each position based on link type
  if (link.linkType === 'TOP_N') {
    const topN = link.qualificationConfig.count;
    
    for (let i = 0; i < standings.length; i++) {
      const currentTeam = maxPossiblePoints[i];
      
      // Check if this team's position is guaranteed
      // Count how many teams can possibly overtake them
      const teamsBelow = maxPossiblePoints.slice(i + 1);
      const teamsThatCanOvertake = teamsBelow.filter(t => 
        t.maxPoints > currentTeam.currentPoints
      );
      
      // If position i+1 is in top N AND fewer than (i+1 - topN) teams can overtake
      // Then this team is guaranteed top N
      if (i < topN) {
        const positionsToProtect = i + 1; // Current position (1-indexed)
        const maxPossibleOvertakes = teamsThatCanOvertake.length;
        
        if (positionsToProtect + maxPossibleOvertakes <= topN) {
          confirmedTeams.push({
            seasonTeamId: currentTeam.teamId,
            confirmedPosition: positionsToProtect,
            confirmedAt: new Date()
          });
        }
      }
    }
  }
  
  if (link.linkType === 'WINNER') {
    const leader = maxPossiblePoints[0];
    const secondPlace = maxPossiblePoints[1];
    
    // Leader is guaranteed winner if 2nd place can't catch up
    if (secondPlace && secondPlace.maxPoints < leader.currentPoints) {
      confirmedTeams.push({
        seasonTeamId: leader.teamId,
        confirmedPosition: 1,
        confirmedAt: new Date()
      });
    }
  }
  
  // Similar logic for BOTTOM_N, POSITION_RANGE, etc.
  
  return confirmedTeams;
}
```

### Progressive Population Process

```typescript
// Called after every match update or standings change
async function checkAndPopulateConfirmedTeams(tournamentId: string) {
  // 1. Get all active outgoing links for this tournament
  const activeLinks = await getTournamentLinks(tournamentId, 'outgoing', 'ACTIVE');
  
  for (const link of activeLinks) {
    // 2. Check which teams are now mathematically guaranteed
    const confirmedTeams = await checkGuaranteedQualifications(
      tournamentId,
      link.id
    );
    
    // 3. Get already populated teams
    const alreadyPopulated = await getPopulatedTeams(link.id);
    const alreadyPopulatedIds = new Set(alreadyPopulated.map(t => t.seasonTeamId));
    
    // 4. Filter out teams already populated
    const newlyConfirmed = confirmedTeams.filter(t => 
      !alreadyPopulatedIds.has(t.seasonTeamId)
    );
    
    // 5. Populate newly confirmed teams
    if (newlyConfirmed.length > 0) {
      await populateConfirmedTeams(link, newlyConfirmed);
      
      // 6. Send notifications
      await notifyTeamsQualified(newlyConfirmed, link);
      await notifyAdminPartialQualification(link, newlyConfirmed.length);
    }
    
    // 7. Check if all positions are now filled
    const totalPopulated = alreadyPopulated.length + newlyConfirmed.length;
    const expectedTeams = link.qualificationConfig.count || link.targetTournament.expectedTeams;
    
    if (totalPopulated === expectedTeams) {
      await updateTournamentLink(link.id, {
        status: 'COMPLETED',
        teamsPopulated: true
      });
    }
  }
}

// Populate specific confirmed teams
async function populateConfirmedTeams(
  link: TournamentLink,
  confirmedTeams: ConfirmedTeam[]
) {
  for (const team of confirmedTeams) {
    // 1. Create qualification record
    await createQualification({
      tournamentLinkId: link.id,
      seasonTeamId: team.seasonTeamId,
      sourceTournamentId: link.sourceTournamentId,
      targetTournamentId: link.targetTournamentId,
      qualificationPosition: team.confirmedPosition,
      confirmedAt: team.confirmedAt,
      slotNumber: team.confirmedPosition, // Or use seed mapping
      status: 'CONFIRMED' // NEW: marks as mathematically confirmed
    });
    
    // 2. Add to target tournament
    await addTeamToTournament(link.targetTournamentId, {
      seasonTeamId: team.seasonTeamId,
      seedPosition: team.confirmedPosition,
      qualificationStatus: 'CONFIRMED'
    });
  }
  
  // 3. Update target tournament qualification status
  await updateTournamentQualificationStatus(link.targetTournamentId);
}

// Full population (when tournament completes or manual trigger)
async function populateTournamentLink(linkId: string, options?: {
  force?: boolean,
  dryRun?: boolean
}) {
  const link = await getTournamentLink(linkId);
  
  // 1. Validate if needed
  if (!options?.force && link.sourceTournament.status !== 'COMPLETED') {
    throw new Error('Source tournament not complete. Use force=true to populate anyway.');
  }
  
  // 2. Get all qualified teams (final standings)
  const qualifiedTeams = await getQualifiedTeams(
    link.sourceTournamentId,
    link.linkType,
    link.qualificationConfig
  );
  
  // 3. Get already confirmed teams
  const alreadyPopulated = await getPopulatedTeams(link.id);
  const alreadyPopulatedIds = new Set(alreadyPopulated.map(t => t.seasonTeamId));
  
  // 4. Filter out already populated
  const newTeams = qualifiedTeams.filter(t => 
    !alreadyPopulatedIds.has(t.seasonTeamId)
  );
  
  // 5. Dry run preview
  if (options?.dryRun) {
    return {
      alreadyPopulated: alreadyPopulated.length,
      newTeams: newTeams.length,
      total: qualifiedTeams.length,
      teams: qualifiedTeams,
      preview: true
    };
  }
  
  // 6. Populate remaining teams
  if (newTeams.length > 0) {
    for (const team of newTeams) {
      await createQualification({
        tournamentLinkId: link.id,
        seasonTeamId: team.seasonTeamId,
        sourceTournamentId: link.sourceTournamentId,
        targetTournamentId: link.targetTournamentId,
        qualificationPosition: team.qualificationPosition,
        slotNumber: team.seedPosition,
        status: 'FINAL' // Tournament complete
      });
      
      await addTeamToTournament(link.targetTournamentId, {
        seasonTeamId: team.seasonTeamId,
        seedPosition: team.seedPosition,
        qualificationStatus: 'FINAL'
      });
    }
  }
  
  // 7. Mark link as completed
  await updateTournamentLink(link.id, {
    status: 'COMPLETED',
    teamsPopulated: true,
    populatedAt: new Date()
  });
  
  return { 
    success: true, 
    alreadyPopulated: alreadyPopulated.length,
    newlyPopulated: newTeams.length,
    total: qualifiedTeams.length
  };
}
```

### Automatic Trigger Points

```typescript
// 1. After every match result is saved
async function onMatchResultSaved(matchId: string) {
  const match = await getMatch(matchId);
  await updateStandings(match.tournamentId);
  
  // CHECK FOR CONFIRMED QUALIFICATIONS
  await checkAndPopulateConfirmedTeams(match.tournamentId);
}

// 2. When tournament is marked complete
async function onTournamentComplete(tournamentId: string) {
  const outgoingLinks = await getTournamentLinks(tournamentId, 'outgoing');
  
  for (const link of outgoingLinks) {
    // Populate any remaining teams
    await populateTournamentLink(link.id);
  }
}

// 3. Manual admin trigger
async function adminTriggerPopulation(linkId: string, force: boolean) {
  return await populateTournamentLink(linkId, { force });
}
```

### Qualification Resolution Functions

```typescript
// Get qualified teams based on link type
async function getQualifiedTeams(
  tournamentId: string,
  linkType: string,
  config: any
): Promise<QualifiedTeam[]> {
  
  switch (linkType) {
    case 'TOP_N':
      return getTopNTeams(tournamentId, config.count, config.groupBy);
    
    case 'BOTTOM_N':
      return getBottomNTeams(tournamentId, config.count, config.groupBy);
    
    case 'POSITION_RANGE':
      return getTeamsInRange(
        tournamentId,
        config.startPosition,
        config.endPosition
      );
    
    case 'WINNER':
      return getTeamAtPosition(tournamentId, 1, config.slotNumber);
    
    case 'RUNNER_UP':
      return getTeamAtPosition(tournamentId, 2, config.slotNumber);
    
    case 'GROUP_POSITION':
      return getGroupPositionTeams(
        tournamentId,
        config.position,
        config.groupNames,
        config.seedMapping
      );
    
    case 'MULTIPLE_POSITIONS_PER_GROUP':
      return getMultipleGroupPositions(
        tournamentId,
        config.positionsPerGroup,
        config.groupNames,
        config.seedMapping
      );
    
    default:
      throw new Error(`Unknown link type: ${linkType}`);
  }
}

// Example: Get top N teams
async function getTopNTeams(
  tournamentId: string,
  count: number,
  groupBy: string | null
): Promise<QualifiedTeam[]> {
  
  if (groupBy === 'group') {
    // Get top N from each group
    const groups = await getGroups(tournamentId);
    const teams: QualifiedTeam[] = [];
    
    for (const group of groups) {
      const standings = await getStandings(tournamentId, group.name);
      const topTeams = standings.slice(0, count);
      
      teams.push(...topTeams.map((s, index) => ({
        seasonTeamId: s.teamId,
        qualificationPosition: index + 1,
        groupName: group.name,
        seedPosition: teams.length + index + 1
      })));
    }
    
    return teams;
  } else {
    // Get top N overall
    const standings = await getOverallStandings(tournamentId);
    const topTeams = standings.slice(0, count);
    
    return topTeams.map((s, index) => ({
      seasonTeamId: s.teamId,
      qualificationPosition: index + 1,
      groupName: null,
      seedPosition: index + 1
    }));
  }
}
```

## UI Components

### 1. Tournament Link Manager (Admin)

**Location:** `/sub-admin/[seasonId]/tournaments/[tournamentId]/links`

**Features:**
- View all incoming links (tournaments feeding into this one)
- View all outgoing links (where this tournament feeds into)
- Create new links
- Edit link configurations
- Preview qualified teams
- Manually trigger population
- Clear populated teams

**UI Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Tournament Links - Premier League                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ▼ Outgoing Links (Where teams advance to)               │
│   ┌──────────────────────────────────────────────────┐  │
│   │ → Top 8 Playoffs                                 │  │
│   │   Type: TOP_N (8 teams)                         │  │
│   │   Status: ⏳ Pending                            │  │
│   │   [Preview] [Populate Now] [Edit] [Delete]     │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │ → Relegation Tournament                          │  │
│   │   Type: BOTTOM_N (4 teams)                      │  │
│   │   Status: ⏳ Pending                            │  │
│   │   [Preview] [Populate Now] [Edit] [Delete]     │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
│ ▼ Incoming Links (Source tournaments)                   │
│   None - This is a source tournament                    │
│                                                          │
│ [+ Add New Link]                                        │
└─────────────────────────────────────────────────────────┘
```

### 2. Create Tournament Link Dialog

```
┌─────────────────────────────────────────────────────────┐
│ Create Tournament Link                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Source Tournament                                        │
│ [Premier League ▼]                                       │
│                                                          │
│ Target Tournament                                        │
│ [Top 8 Playoffs ▼]                                       │
│                                                          │
│ Link Type                                                │
│ [TOP_N ▼] Top N Teams                                    │
│                                                          │
│ ──── Configuration ────────────────────────────          │
│                                                          │
│ Number of Teams                                          │
│ [8]                                                      │
│                                                          │
│ Grouping                                                 │
│ ( ) Overall Standings                                    │
│ ( ) Per Group                                            │
│                                                          │
│ Seed Mapping (Optional)                                  │
│ ┌─────────────────────────────────────────┐             │
│ │ Position 1 → Seed 1                     │             │
│ │ Position 2 → Seed 2                     │             │
│ │ Position 3 → Seed 3                     │             │
│ │ ...                                      │             │
│ └─────────────────────────────────────────┘             │
│                                                          │
│          [Cancel]  [Create Link]                         │
└─────────────────────────────────────────────────────────┘
```

### 3. Preview Qualified Teams Dialog

```
┌─────────────────────────────────────────────────────────┐
│ Preview Qualified Teams                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Link: Premier League → Top 8 Playoffs                    │
│ Type: TOP_N (8 teams)                                    │
│                                                          │
│ ⚠️ Source tournament not yet complete.                   │
│ This is a preview based on current standings.            │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Pos │ Team          │ Points │ → Seed              │  │
│ ├────────────────────────────────────────────────────┤  │
│ │ 1   │ Thunder FC    │ 45     │ → Seed 1            │  │
│ │ 2   │ Lightning     │ 42     │ → Seed 2            │  │
│ │ 3   │ Storm United  │ 39     │ → Seed 3            │  │
│ │ 4   │ Blaze FC      │ 36     │ → Seed 4            │  │
│ │ 5   │ Inferno       │ 33     │ → Seed 5            │  │
│ │ 6   │ Phoenix       │ 30     │ → Seed 6            │  │
│ │ 7   │ Ember FC      │ 27     │ → Seed 7            │  │
│ │ 8   │ Flame United  │ 24     │ → Seed 8            │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│     [Cancel]  [Populate Now (Force)]                     │
└─────────────────────────────────────────────────────────┘
```

### 4. Tournament Card - Linked Status

Add visual indicator on tournament cards:

```
┌─────────────────────────────────────┐
│ Premier League                      │
│ Status: In Progress                 │
│                                     │
│ 🔗 Linked to:                      │
│   • Top 8 Playoffs (Top 8)         │
│   • Relegation (Bottom 4)          │
└─────────────────────────────────────┘
```

## Prisma Schema Updates

```prisma
model tournaments {
  id                   String                         @id
  seasonId             String
  name                 String
  tournamentType       TournamentType
  startDate            DateTime
  endDate              DateTime?
  status               TournamentStatus               @default(UPCOMING)
  description          String?
  leagueLegs           Int?                           @default(2)
  playoffFormat        String?
  groupLegs            Int?                           @default(1)
  groupQualifiers      Int?                           @default(2)
  knockoutConfig       String?
  createdAt            DateTime                       @default(now())
  updatedAt            DateTime
  
  // NEW FIELDS
  isLinked             Boolean                        @default(false)
  requiresQualification Boolean                       @default(false)
  qualificationStatus  TournamentQualificationStatus  @default(COMPLETE)
  expectedTeams        Int?
  
  // Relations
  groups               groups[]
  knockoutRounds       knockout_rounds[]
  matches              matches[]
  standings            standings[]
  tournamentTeams      tournament_teams[]
  season               seasons                        @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  teamAwards           team_awards[]
  
  // NEW RELATIONS
  outgoingLinks        tournament_links[]             @relation("SourceTournament")
  incomingLinks        tournament_links[]             @relation("TargetTournament")
  qualificationsFrom   tournament_team_qualifications[] @relation("SourceTournamentQualifications")
  qualificationsTo     tournament_team_qualifications[] @relation("TargetTournamentQualifications")
  
  @@unique([seasonId, name])
}

model tournament_links {
  id                   String                         @id
  sourceTournamentId   String                         @map("source_tournament_id")
  targetTournamentId   String                         @map("target_tournament_id")
  linkType             TournamentLinkType
  qualificationConfig  Json                           @map("qualification_config")
  status               TournamentLinkStatus           @default(PENDING)
  teamsPopulated       Boolean                        @default(false) @map("teams_populated")
  populatedAt          DateTime?                      @map("populated_at")
  createdAt            DateTime                       @default(now()) @map("created_at")
  updatedAt            DateTime                       @updatedAt @map("updated_at")
  
  sourceTournament     tournaments                    @relation("SourceTournament", fields: [sourceTournamentId], references: [id], onDelete: Cascade)
  targetTournament     tournaments                    @relation("TargetTournament", fields: [targetTournamentId], references: [id], onDelete: Cascade)
  qualifications       tournament_team_qualifications[]
  
  @@unique([sourceTournamentId, targetTournamentId])
  @@index([sourceTournamentId])
  @@index([targetTournamentId])
  @@index([status])
}

model tournament_team_qualifications {
  id                   String          @id
  tournamentLinkId     String          @map("tournament_link_id")
  seasonTeamId         String          @map("season_team_id")
  sourceTournamentId   String          @map("source_tournament_id")
  targetTournamentId   String          @map("target_tournament_id")
  qualificationPosition Int?           @map("qualification_position")
  groupName            String?         @map("group_name")
  qualifiedAt          DateTime        @default(now()) @map("qualified_at")
  slotNumber           Int?            @map("slot_number")
  createdAt            DateTime        @default(now()) @map("created_at")
  
  tournamentLink       tournament_links @relation(fields: [tournamentLinkId], references: [id], onDelete: Cascade)
  seasonTeam           season_teams     @relation("TeamQualifications", fields: [seasonTeamId], references: [id], onDelete: Cascade)
  sourceTournament     tournaments      @relation("SourceTournamentQualifications", fields: [sourceTournamentId], references: [id], onDelete: Cascade)
  targetTournament     tournaments      @relation("TargetTournamentQualifications", fields: [targetTournamentId], references: [id], onDelete: Cascade)
  
  @@unique([tournamentLinkId, seasonTeamId])
  @@index([tournamentLinkId])
  @@index([seasonTeamId])
  @@index([sourceTournamentId])
  @@index([targetTournamentId])
}

// Add to season_teams model
model season_teams {
  // ... existing fields ...
  
  qualifications      tournament_team_qualifications[] @relation("TeamQualifications")
}

// NEW ENUMS
enum TournamentLinkType {
  TOP_N
  BOTTOM_N
  POSITION_RANGE
  WINNER
  RUNNER_UP
  GROUP_POSITION
  MULTIPLE_POSITIONS_PER_GROUP
}

enum TournamentLinkStatus {
  PENDING      // Link created, teams not yet populated
  ACTIVE       // Source tournament in progress
  COMPLETED    // Teams populated successfully
  FAILED       // Population failed
}

enum TournamentQualificationStatus {
  PENDING      // Waiting for qualifications
  PARTIAL      // Some but not all teams qualified
  COMPLETE     // All teams populated
}
```

## Implementation Steps

### Phase 1: Database Setup
1. Create migration files for new tables
2. Add new enum types
3. Update tournaments table with new columns
4. Create indexes

### Phase 2: API Development
1. Create tournament link CRUD endpoints
2. Implement qualification resolution logic
3. Add population trigger endpoints
4. Create preview functionality

### Phase 3: UI Components
1. Tournament link manager page
2. Create/edit link dialogs
3. Preview qualified teams modal
4. Link status indicators

### Phase 4: Automation
1. Tournament completion hook
2. Auto-population on tournament complete
3. Notification system for qualification
4. Error handling and retry logic

### Phase 5: Testing & Polish
1. Test all link types
2. Test edge cases (ties, incomplete data)
3. Test manual vs automatic population
4. Performance optimization

## Edge Cases & Considerations

### 1. Ties in Standings
- Use existing tiebreaker logic (goal difference, head-to-head, etc.)
- Admin can manually resolve if needed

### 2. Tournament Incomplete
- Preview mode shows "provisional" qualified teams
- Warning when forcing population before completion

### 3. Team Count Mismatch
- Validation: Ensure qualified teams match expected count
- Block population if mismatch (unless forced)

### 4. Multiple Links from Same Source
- Allow multiple outgoing links (e.g., top 8 to playoffs, bottom 4 to relegation)
- Each link is independent

### 5. Circular Dependencies
- Prevent creating links that form cycles
- Validate on link creation

### 6. Tournament Already Has Teams
- Option to clear existing teams before population
- Warning dialog if teams already exist

### 7. Seeding Conflicts
- Validate seed mapping doesn't have duplicates
- Auto-generate if not provided

## Future Enhancements

1. **Conditional Links**: Links that activate based on conditions
   - Example: Only create playoff if more than 4 teams eligible

2. **Complex Qualification Rules**: 
   - Best third-place teams across multiple groups
   - Weighted qualifications (points + goal difference criteria)

3. **Historical Tracking**:
   - Track all qualifications across seasons
   - Achievement badges for consistent qualifiers

4. **Notification System**:
   - Notify teams when they qualify
   - Alerts for admins when population is ready

5. **Visual Tournament Tree**:
   - Flowchart showing tournament progression
   - Interactive diagram of linked tournaments

## Summary

This tournament linking system provides:
- ✅ Flexible linking between tournaments
- ✅ Multiple qualification types (top N, positions, groups)
- ✅ Automatic and manual population
- ✅ Preview before population
- ✅ Clear audit trail
- ✅ Admin UI for management
- ✅ Works retroactively (populate after tournament complete)
