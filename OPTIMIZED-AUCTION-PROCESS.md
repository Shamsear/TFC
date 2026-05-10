# Optimized Auction System - Minimal Database Writes

## Problem Statement
With 32 teams bidding on 32 players per round:
- **1,024 database writes per round** (32 teams × 32 bids)
- Expensive on Neon database
- Slow performance
- High costs

## Solution: Batch Storage with Single Write Per Team

### Core Concept
Instead of saving each bid individually, store ALL bids from a team as a **single encrypted JSON blob** in one database row.

---

## 1. DATABASE SCHEMA (OPTIMIZED)

### Current Database Tables (Existing)

#### `base_players` - Master player list
```sql
- id: String (primary key)
- player_id: String (unique, optional)
- name: String
- photoUrl: String
- createdAt: DateTime
- updatedAt: DateTime
```

#### `seasonal_player_stats` - Player stats per season
```sql
- id: String (primary key)
- basePlayerId: String (FK to base_players)
- seasonId: String (FK to seasons)
- position: String
- realWorldClub: String
- overallRating: Int
- [many other stats fields...]
- UNIQUE(basePlayerId, seasonId)
```

#### `transfer_history` - Player ownership/purchases
```sql
- id: String (primary key)
- basePlayerId: String (FK to base_players)
- seasonId: String (FK to seasons)
- teamId: String (FK to teams)
- soldPrice: Int
- createdAt: DateTime
```
**Note:** This table tracks which team owns which player in which season.

#### `season_teams` - Team participation in seasons
```sql
- id: String (primary key)
- seasonId: String (FK to seasons)
- teamId: String (FK to teams)
- currentBudget: Int
- finalBudget: Int (nullable)
- trophiesWon: Int (default 0)
- UNIQUE(seasonId, teamId)
```

#### `financial_ledger` - Transaction history
```sql
- id: String (primary key)
- seasonTeamId: String (FK to season_teams)
- seasonId: String (FK to seasons)
- transactionType: Enum (INITIAL_PURSE, PLAYER_PURCHASE, PLAYER_SALE, ADJUSTMENT)
- amount: Int
- previousBalance: Int
- newBalance: Int
- description: String (nullable)
- createdAt: DateTime
```

### New Tables for Auction System

#### `rounds` table
```sql
CREATE TABLE rounds (
  id VARCHAR(20) PRIMARY KEY,
  season_id VARCHAR(20) NOT NULL REFERENCES seasons(id),
  position VARCHAR(50),
  round_number INT NOT NULL,
  round_type VARCHAR(10) NOT NULL, -- 'normal' | 'bulk'
  max_bids_per_team INT,
  base_price INT,
  duration_seconds INT NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(30) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `team_round_bids` table (NEW - Single row per team per round)
```sql
CREATE TABLE team_round_bids (
  id VARCHAR(50) PRIMARY KEY, -- SSPSLT0001_SSPSLFR00001
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  encrypted_bids TEXT NOT NULL, -- JSON: [{player_id, amount}, ...]
  submitted BOOLEAN DEFAULT FALSE,
  bid_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  UNIQUE(round_id, team_id)
);
```

**Key Benefits:**
- ✅ **32 writes per round** instead of 1,024 (97% reduction!)
- ✅ One row per team per round
- ✅ All bids encrypted together
- ✅ Atomic updates (replace entire blob)
- ✅ Survives server restarts/outages

---

## 2. BID STORAGE FORMAT

### Encrypted JSON Structure
```json
{
  "bids": [
    {
      "base_player_id": "SSPSLBP00001",
      "player_name": "Cristiano Ronaldo",
      "amount": 150000,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "base_player_id": "SSPSLBP00002", 
      "player_name": "Lionel Messi",
      "amount": 140000,
      "timestamp": "2024-01-15T10:31:00Z"
    }
  ],
  "version": 1,
  "last_modified": "2024-01-15T10:31:00Z"
}
```

**Note:** We use `base_player_id` (from `base_players` table) to identify players.

### Encryption
- Use AES-256-GCM
- Encrypt entire JSON blob
- Store as base64 string in database
- Decrypt only during finalization

---

## 3. BIDDING WORKFLOW

### Team Places/Updates Bids

```
CLIENT SIDE (Team UI):
1. Team views available players
2. Team enters bid amounts for multiple players
3. Bids stored in React state (temporary)
4. Team clicks "Save Draft" or "Submit"

API CALL:
POST /api/auction/rounds/:roundId/bids
Body: {
  bids: [
    {base_player_id: "SSPSLBP00001", amount: 150000},
    {base_player_id: "SSPSLBP00002", amount: 140000}
  ],
  submitted: false // or true for final submission
}

SERVER SIDE:
1. Validate team belongs to season
2. Validate round is active
3. Validate bid count <= max_bids_per_team
4. Validate amounts > 0
5. Encrypt entire bids array
6. UPSERT into team_round_bids (single write!)
   - If row exists: UPDATE encrypted_bids
   - If row doesn't exist: INSERT new row
7. Return success
```

**Database Writes: 1 per save**

---

## 4. NORMAL ROUND FINALIZATION

### Algorithm
```
1. CHECK PREREQUISITES
   - Round status = 'expired' or admin manually triggers
   - No active tiebreakers exist

2. FETCH ALL TEAM BIDS (Single Query)
   SELECT * FROM team_round_bids 
   WHERE round_id = :roundId

3. DECRYPT ALL BIDS
   For each team:
     - Decrypt encrypted_bids JSON
     - Parse bids array
     - Store in memory: Map<base_player_id, [{team_id, amount}]>

4. SEPARATE SUBMITTED vs NON-SUBMITTED TEAMS
   submitted_teams = teams where submitted = true
   non_submitted_teams = teams where submitted = false

5. ALLOCATE TO SUBMITTED TEAMS (1 player per team max)
   allocated_teams = Set()
   allocated_players = Set()
   
   While (bids exist AND teams need players):
     a. Get all bids for unallocated players from unallocated teams
     b. Find highest bid
     c. Check for ties (same amount, same player):
        - If TIE: Create tiebreaker, STOP finalization
        - If NO TIE: Allocate player to team
     d. Add team to allocated_teams
     e. Add player to allocated_players
     f. Remove team's other bids
     g. Remove player from all other teams' bids

6. HANDLE NON-SUBMITTED TEAMS (Phase-based)
   Phase 1 & 3:
     - Calculate average/minimum price
     - Randomly allocate from their bids OR position pool
   Phase 2:
     - Skip (no forced allocation)

7. UPDATE DATABASE (Batch Operations)
   BEGIN TRANSACTION:
     a. Insert into transfer_history (bulk insert - records player purchases)
     b. Update season_teams.currentBudget (bulk update - deduct amounts)
     c. Insert into financial_ledger (bulk insert - transaction records)
     d. Update team_round_bids status (mark won/lost)
     e. Update round status = 'completed'
   COMMIT TRANSACTION

8. BROADCAST UPDATES
   - Real-time notifications
   - FCM push notifications
```

**Database Writes During Finalization:**
- 1 read query (all bids)
- Bulk updates (not per-bid)
- ~50-100 writes total (vs 1,024+)

---


## 5. TIEBREAKER SYSTEM (OPTIMIZED)

### Normal Round Tiebreakers

#### Database Tables
```sql
CREATE TABLE tiebreakers (
  id VARCHAR(20) PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  base_player_id VARCHAR(20) NOT NULL REFERENCES base_players(id),
  original_amount INT NOT NULL,
  tied_teams_count INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  winning_team_id VARCHAR(20),
  winning_bid INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_tiebreaker_bids (
  id VARCHAR(50) PRIMARY KEY,
  tiebreaker_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  old_bid_amount INT NOT NULL,
  new_bid_amount INT,
  submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP,
  UNIQUE(tiebreaker_id, team_id)
);
```

**Database Writes:**
- Create tiebreaker: 1 write + N writes (N = tied teams)
- Each team submits: 1 write
- Resolution: 1 write

**Total: ~10-20 writes per tiebreaker** (acceptable)

---

## 6. BULK ROUNDS (OPTIMIZED)

### Problem
Bulk rounds have different behavior:
- Teams select multiple players at fixed price
- No encrypted bidding needed
- Need to track which teams want which players

### Solution: Batch Bid Storage

#### Database Table
```sql
CREATE TABLE bulk_round_selections (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  selected_players JSONB NOT NULL, -- Array of player IDs
  submitted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_id, team_id)
);
```

**Format:**
```json
{
  "players": [
    "SSPSLBP00001",
    "SSPSLBP00002",
    "SSPSLBP00003"
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Note:** Array contains `base_player_id` values from `base_players` table.

### Bulk Round Finalization
```
1. FETCH ALL SELECTIONS (Single Query)
   SELECT * FROM bulk_round_selections WHERE round_id = :roundId

2. ANALYZE CONFLICTS
   player_bids = Map<base_player_id, [team_ids]>
   
   For each selection:
     For each player in selected_players:
       player_bids[base_player_id].push(team_id)

3. SEPARATE SINGLE vs MULTIPLE BIDDERS
   single_bidders = players with 1 team
   conflicts = players with 2+ teams

4. IMMEDIATE ALLOCATION (Single Bidders)
   For each single bidder:
     - Validate team has slots (check transfer_history count vs max squad size)
     - Validate team has budget (check season_teams.currentBudget)
     - Allocate player
   
   Batch database updates (not per-player)

5. MARK CONFLICTS
   For each conflict:
     - Update round_players (status='pending', bid_count)
     - Admin must create bulk tiebreaker

6. UPDATE DATABASE (Batch)
   BEGIN TRANSACTION:
     - Bulk insert into transfer_history (player purchases)
     - Bulk update season_teams.currentBudget (deduct amounts)
     - Bulk insert into financial_ledger (transaction records)
     - Update round status
   COMMIT TRANSACTION
```

**Database Writes:**
- 32 writes for selections (1 per team)
- Bulk updates during finalization (~50-100 writes)

---

## 7. BULK TIEBREAKERS (Last Person Standing)

### Database Tables
```sql
CREATE TABLE bulk_tiebreakers (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  base_player_id VARCHAR(20) NOT NULL REFERENCES base_players(id),
  base_price INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  current_highest_bid INT,
  current_highest_team_id VARCHAR(20),
  teams_remaining INT NOT NULL,
  start_time TIMESTAMP,
  max_end_time TIMESTAMP
);

CREATE TABLE bulk_tiebreaker_participants (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active/withdrawn
  current_bid INT,
  last_bid_time TIMESTAMP,
  UNIQUE(tiebreaker_id, team_id)
);

CREATE TABLE bulk_tiebreaker_bid_history (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  bid_amount INT NOT NULL,
  bid_time TIMESTAMP DEFAULT NOW()
);
```

### Bidding Process
```
POST /api/team/bulk-tiebreakers/:id/bid
Body: { bid_amount: 15000 }

SERVER:
1. Validate bid > current_highest_bid
2. Validate team has budget
3. BEGIN TRANSACTION:
   - UPDATE bulk_tiebreakers SET current_highest_bid, current_highest_team_id
   - UPDATE bulk_tiebreaker_participants SET current_bid, last_bid_time
   - INSERT INTO bulk_tiebreaker_bid_history
   COMMIT
4. Broadcast update to all teams
5. Check if teams_remaining = 1 → Auto-finalize
```

**Database Writes:**
- Each bid: 3 writes (acceptable for open auction)
- Withdrawal: 2 writes
- Finalization: ~10-20 writes

---

## 8. BACKUP & RECOVERY STRATEGY

### Problem
What if database fails during bidding?

### Solution: Multi-Layer Backup

#### Layer 1: Database (Primary)
- All bids stored in `team_round_bids` table
- Encrypted and persistent
- Survives server restarts

#### Layer 2: Server Memory Cache (Optional)
```typescript
// In-memory cache for active rounds
const activeBidsCache = new Map<string, Map<string, any>>()
// Key: round_id -> team_id -> decrypted_bids

// On server start, load active rounds into cache
// On bid update, update both cache and database
```

#### Layer 3: Audit Log (Optional)
```sql
CREATE TABLE bid_audit_log (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL,
  team_id VARCHAR(20) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'create', 'update', 'submit'
  encrypted_bids TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

**Write on every bid update** (for audit trail)
- Can be async (doesn't block user)
- Can be in separate database/file
- Used only for recovery/debugging

#### Layer 4: JSON File Backup (Your Suggestion)
```typescript
// On each bid update, also write to file
const backupPath = `/backups/rounds/${roundId}/team_${teamId}.json`

await fs.writeFile(backupPath, JSON.stringify({
  round_id: roundId,
  team_id: teamId,
  encrypted_bids: encryptedData,
  timestamp: new Date().toISOString()
}))
```

**Benefits:**
- File system is separate from database
- Can recover even if database is corrupted
- Easy to inspect/debug

**Drawbacks:**
- File I/O can be slow
- Need to manage file cleanup
- Concurrency issues if multiple servers

---

## 9. RECOMMENDED ARCHITECTURE

### Primary Storage: Database
```
team_round_bids table
- Single row per team per round
- Encrypted JSON blob
- 32 writes per round (acceptable)
```

### Backup Storage: Audit Log Table
```
bid_audit_log table
- Append-only log
- Every bid update logged
- Async writes (doesn't block user)
- Can be in cheaper database tier
```

### Recovery Process
```
IF database fails:
  1. Check bid_audit_log for latest bids
  2. Restore to team_round_bids
  3. Continue finalization

IF both fail:
  1. Check JSON file backups (if implemented)
  2. Manually restore
```

---

## 10. COMPLETE WORKFLOW EXAMPLE

### Normal Round - Start to Finish

#### Step 1: Admin Creates Round
```
POST /api/admin/rounds
Body: {
  season_id: "SSPSLS00001",
  position: "ST",
  round_number: 5,
  max_bids_per_team: 32,
  duration_seconds: 3600
}

Database Writes: 1 (create round)
```

#### Step 2: Admin Starts Round
```
POST /api/admin/rounds/:id/start

Database Writes: 1 (update round status)
```

#### Step 3: Teams Place Bids (Over 1 hour)
```
Team 1: POST /api/auction/rounds/:id/bids
  - Bids on 10 players
  - Database Writes: 1 (upsert team_round_bids)

Team 1 (updates): POST /api/auction/rounds/:id/bids
  - Changes 3 bids, adds 5 more
  - Database Writes: 1 (update team_round_bids)

Team 1 (submits): POST /api/auction/rounds/:id/bids
  - Final submission
  - Database Writes: 1 (update submitted=true)

... repeat for all 32 teams ...

Total Database Writes: ~96 (32 teams × ~3 updates average)
```

#### Step 4: Round Expires
```
Automatic trigger or admin manual finalize

POST /api/admin/rounds/:id/finalize

Process:
1. Fetch all bids (1 query)
2. Decrypt in memory
3. Allocate players
4. Batch database updates (~50-100 writes)

Database Writes: ~50-100
```

#### Step 5: Tiebreaker (if needed)
```
If 2 teams bid same amount on same player:

Create tiebreaker:
  - Database Writes: 3 (1 tiebreaker + 2 team_tiebreaker_bids)

Teams submit new bids:
  - Database Writes: 2 (1 per team)

Resolution:
  - Database Writes: 1 (update tiebreaker status)

Total: ~6 writes
```

### Total Database Writes Per Round
- Round creation: 1
- Round start: 1
- Team bidding: ~96
- Finalization: ~50-100
- Tiebreakers: ~6 (if any)

**Grand Total: ~150-200 writes per round**

Compare to original: 1,024+ writes per round
**Savings: 80-85% reduction!**

---

## 11. API ROUTES SUMMARY

### Normal Rounds
```
POST   /api/admin/rounds                    - Create round
POST   /api/admin/rounds/:id/start          - Start round
POST   /api/admin/rounds/:id/finalize       - Finalize round
GET    /api/admin/rounds/:id                - Get round details

POST   /api/auction/rounds/:id/bids         - Place/update bids (UPSERT)
GET    /api/auction/rounds/:id/my-bids      - Get my bids
GET    /api/auction/rounds/:id              - Get round info
```

### Tiebreakers
```
GET    /api/admin/tiebreakers               - List all tiebreakers
GET    /api/admin/tiebreakers/:id           - Get tiebreaker details

POST   /api/tiebreakers/:id/bid             - Submit new bid
GET    /api/tiebreakers/:id                 - Get tiebreaker info
```

### Bulk Rounds
```
POST   /api/admin/bulk-rounds               - Create bulk round
POST   /api/admin/bulk-rounds/:id/start     - Start round
POST   /api/admin/bulk-rounds/:id/finalize  - Finalize round

POST   /api/team/bulk-rounds/:id/select     - Select players (UPSERT)
GET    /api/team/bulk-rounds/:id/my-selections - Get my selections
```

### Bulk Tiebreakers
```
POST   /api/admin/bulk-tiebreakers          - Create tiebreaker
GET    /api/admin/bulk-tiebreakers          - List tiebreakers

POST   /api/team/bulk-tiebreakers/:id/bid   - Place bid
POST   /api/team/bulk-tiebreakers/:id/withdraw - Withdraw
GET    /api/team/bulk-tiebreakers/:id       - Get tiebreaker info
```

---

## 12. KEY IMPLEMENTATION FILES

### Core Logic
```
lib/
  encryption.ts              - Encrypt/decrypt bid data
  finalize-round.ts          - Normal round finalization
  finalize-bulk-round.ts     - Bulk round finalization
  tiebreaker.ts              - Tiebreaker creation/resolution
  finalize-bulk-tiebreaker.ts - Bulk tiebreaker finalization
  reserve-calculator.ts      - Budget reserve calculations
  bid-validator.ts           - Validate bids before saving
```

### API Routes
```
app/api/
  admin/
    rounds/
      route.ts               - Create/list rounds
      [id]/
        start/route.ts       - Start round
        finalize/route.ts    - Finalize round
    bulk-rounds/
      route.ts               - Create/list bulk rounds
      [id]/
        start/route.ts
        finalize/route.ts
    tiebreakers/
      route.ts               - List tiebreakers
    bulk-tiebreakers/
      route.ts               - Create/list bulk tiebreakers
  
  auction/
    rounds/
      [id]/
        bids/route.ts        - Place/update bids (UPSERT)
        my-bids/route.ts     - Get my bids
  
  team/
    bulk-rounds/
      [id]/
        select/route.ts      - Select players (UPSERT)
    bulk-tiebreakers/
      [id]/
        bid/route.ts         - Place bid
        withdraw/route.ts    - Withdraw
  
  tiebreakers/
    [id]/
      bid/route.ts           - Submit tiebreaker bid
```

---

## 13. MIGRATION FROM CURRENT SYSTEM

### Current System
- Admin manually allocates each player
- Direct database writes
- No bidding process

### Migration Steps

#### Phase 1: Add New Tables
```sql
-- Run migration scripts
CREATE TABLE rounds (...);
CREATE TABLE team_round_bids (...);
CREATE TABLE tiebreakers (...);
-- etc.
```

#### Phase 2: Keep Both Systems
- Old system: `/auction` (manual allocation)
- New system: `/auction-v2` (bidding system)
- Feature flag to toggle

#### Phase 3: Test New System
- Run test auctions
- Verify finalization works
- Test tiebreakers
- Check budget calculations

#### Phase 4: Switch Over
- Disable old system
- Enable new system
- Update all links/navigation

#### Phase 5: Cleanup
- Remove old code
- Remove old API routes
- Update documentation

---

## 14. PERFORMANCE OPTIMIZATIONS

### Database Indexes
```sql
CREATE INDEX idx_team_round_bids_round ON team_round_bids(round_id);
CREATE INDEX idx_team_round_bids_team ON team_round_bids(team_id);
CREATE INDEX idx_team_round_bids_submitted ON team_round_bids(round_id, submitted);

CREATE INDEX idx_rounds_season_status ON rounds(season_id, status);
CREATE INDEX idx_rounds_end_time ON rounds(end_time) WHERE status = 'active';
```

### Caching Strategy
```typescript
// Cache active rounds in memory
const activeRoundsCache = new Map()

// Cache team bids during active round
const teamBidsCache = new Map()

// Invalidate on updates
```

### Batch Operations
```typescript
// Instead of individual updates
for (const player of players) {
  await db.update(player)
}

// Use batch update
await db.batchUpdate(players)
```

---

## 15. SECURITY CONSIDERATIONS

### Encryption Key Management
```typescript
// Store encryption key in environment variable
const ENCRYPTION_KEY = process.env.AUCTION_ENCRYPTION_KEY

// Rotate keys periodically
// Keep old keys for decrypting historical data
```

### Bid Tampering Prevention
```typescript
// Add HMAC signature to encrypted data
const signature = createHmac('sha256', SECRET_KEY)
  .update(encryptedData)
  .digest('hex')

// Verify signature before decryption
```

### Rate Limiting
```typescript
// Limit bid updates per team
const RATE_LIMIT = 10 // updates per minute

// Prevent spam/DOS attacks
```

---

## 16. MONITORING & ALERTS

### Key Metrics
- Bid submission rate
- Database write count
- Finalization duration
- Tiebreaker resolution time
- Failed transactions

### Alerts
- Round finalization fails
- Tiebreaker stuck (no submissions)
- Database write errors
- Encryption/decryption failures

---

## SUMMARY

### Key Improvements Over Original Plan

1. **Database Writes Reduced by 80-85%**
   - Original: 1,024+ writes per round
   - Optimized: 150-200 writes per round

2. **Single Row Per Team Per Round**
   - All bids stored as encrypted JSON blob
   - Atomic updates (UPSERT)
   - No individual bid rows

3. **Batch Operations**
   - Bulk updates during finalization
   - Reduced transaction overhead

4. **Backup Strategy**
   - Primary: Database (team_round_bids)
   - Secondary: Audit log (optional)
   - Tertiary: JSON files (optional)

5. **Maintains All Features**
   - Encrypted bidding
   - Tiebreaker resolution
   - Bulk rounds
   - Phase-based allocation
   - Reserve calculator

### Trade-offs

**Pros:**
- ✅ Massive cost savings (80-85% fewer writes)
- ✅ Better performance
- ✅ Simpler data model
- ✅ Easier to debug (one row per team)
- ✅ Atomic updates (no partial states)

**Cons:**
- ❌ Can't query individual bids easily
- ❌ Must decrypt entire blob to read any bid
- ❌ Slightly larger storage per row

**Verdict:** The pros far outweigh the cons. This is the recommended approach.

---

## NEXT STEPS

1. ✅ Review and approve this optimized design
2. Create database migration scripts
3. Implement encryption utilities
4. Build API routes with UPSERT logic
5. Create admin UI
6. Create team UI
7. Test thoroughly
8. Deploy

This optimized design maintains all the functionality from `auction_process.md` while dramatically reducing database costs and improving performance.


---

## 17. ROUND TIMER AND AUTO-FINALIZATION SYSTEM

### Timer Mechanism

#### Round Creation with Timer
When a round is created, the system calculates the end time:

```typescript
// Normal Rounds
const now = new Date();
const endTime = new Date(now.getTime() + (duration_hours * 3600 * 1000));

// Bulk Rounds
const startTime = new Date();
const endTime = new Date(startTime.getTime() + (duration_seconds * 1000));

// Store in database (UTC)
await prisma.rounds.create({
  data: {
    id: roundId,
    startTime: startTime,
    endTime: endTime,
    status: 'active',
    // ...
  }
});
```

**Key Points:**
- All times stored in UTC (PostgreSQL `TIMESTAMPTZ`)
- `startTime`: When round becomes active
- `endTime`: When round should expire
- `durationSeconds`: Original duration for reference

### Auto-Finalization Methods

The system uses **3 different methods** to detect and finalize expired rounds:

#### Method 1: Lazy Finalization (Primary)
**Trigger**: When any user accesses a round
**File**: `lib/lazy-finalize-round.ts`

```typescript
// Called in these endpoints:
// - GET /api/team/round/:id
// - GET /api/team/round/:id/status
// - GET /api/team/dashboard

export async function checkAndFinalizeExpiredRound(roundId: string) {
  // 1. Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  });
  
  // 2. Check if expired
  const now = new Date();
  const endTime = new Date(round.endTime);
  
  if (now <= endTime) {
    return { finalized: false }; // Not expired yet
  }
  
  // 3. Check finalization mode
  if (round.finalizationMode === 'manual') {
    // Manual mode: Mark as expired_pending_finalization
    await prisma.rounds.update({
      where: { id: roundId },
      data: { status: 'expired_pending_finalization' }
    });
    return { pendingManualFinalization: true };
  }
  
  // 4. Auto mode: Acquire lock
  const lockResult = await prisma.rounds.updateMany({
    where: {
      id: roundId,
      status: 'active'
    },
    data: {
      status: 'finalizing'
    }
  });
  
  if (lockResult.count === 0) {
    return { alreadyFinalized: true }; // Another request got it
  }
  
  // 5. Run finalization
  const result = await finalizeRound(roundId);
  
  // 6. Apply results
  if (result.success) {
    await applyFinalizationResults(roundId, result.allocations);
    return { finalized: true };
  }
  
  // 7. Handle ties
  if (result.tieDetected) {
    // Status remains 'finalizing' until tiebreaker resolved
    return { finalized: true, error: 'Tiebreaker required' };
  }
}
```

**Advantages:**
- No external dependencies
- Immediate response when users access rounds
- Works even without cron jobs

**Disadvantages:**
- Requires user activity to trigger
- May delay finalization if no one accesses the round

#### Method 2: Cron Job (Scheduled)
**Trigger**: Every 5 minutes (configurable)
**File**: `app/api/cron/finalize-rounds/route.ts`
**Configuration**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/finalize-rounds",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Process:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Security check
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Find all expired active rounds
  const expiredRounds = await prisma.rounds.findMany({
    where: {
      status: 'active',
      endTime: {
        lt: new Date()
      }
    },
    orderBy: {
      endTime: 'asc'
    }
  });
  
  // 3. Process each round
  const results = [];
  for (const round of expiredRounds) {
    // Run finalization
    const result = await finalizeRound(round.id);
    
    if (result.success) {
      // Apply results
      await applyFinalizationResults(round.id, result.allocations);
      results.push({ roundId: round.id, success: true });
    } else if (result.tieDetected) {
      // Mark as tiebreaker_pending
      await prisma.rounds.update({
        where: { id: round.id },
        data: { status: 'tiebreaker_pending' }
      });
      results.push({ roundId: round.id, tiebreaker: true });
    }
  }
  
  return NextResponse.json({ success: true, finalized: results });
}
```

**Advantages:**
- Guaranteed execution every 5 minutes
- Works even when no users are active
- Centralized finalization logic

**Disadvantages:**
- Requires Vercel Cron or external cron service
- May have up to 5-minute delay

#### Method 3: On-Demand Check (Public Endpoint)
**Trigger**: Called from public pages (e.g., homepage)
**File**: `app/api/public/check-rounds/route.ts`

```typescript
export async function GET() {
  // Find expired active rounds
  const activeRounds = await prisma.rounds.findMany({
    where: {
      status: 'active',
      endTime: {
        lt: new Date()
      }
    },
    select: { id: true }
  });
  
  // Check and finalize each
  const results = await Promise.all(
    activeRounds.map(round => checkAndFinalizeExpiredRound(round.id))
  );
  
  return NextResponse.json({ success: true, results });
}
```

**Usage:**
```typescript
// Called from homepage or public pages
useEffect(() => {
  fetch('/api/public/check-rounds');
}, []);
```

**Advantages:**
- Works without authentication
- Can be called from any public page
- Provides redundancy

### Finalization Modes

#### Auto Mode (Default/Legacy)
```typescript
finalizationMode: 'auto'
```

**Flow:**
```
1. Round created with endTime
2. Timer expires (endTime < NOW())
3. System detects expiration (lazy/cron/public)
4. Status: active → finalizing
5. Run finalization algorithm
6. Apply results immediately
7. Status: finalizing → completed
```

**No preview, no approval needed**

#### Manual Mode (Committee Approval)
```typescript
finalizationMode: 'manual'
```

**Flow:**
```
1. Round created with endTime
2. Timer expires (endTime < NOW())
3. System detects expiration
4. Status: active → expired_pending_finalization
5. Committee sees "Preview Results" button
6. Committee clicks "Preview Results"
7. Status: expired_pending_finalization → pending_finalization
8. System calculates allocations (preview only)
9. Committee reviews results
10. Committee clicks "Finalize for Real"
11. Apply results to database
12. Status: pending_finalization → completed

Alternative: Committee clicks "Finalize Immediately"
- Skip preview step
- Status: expired_pending_finalization → completed
```

**Allows preview and approval before applying**

### Round Status Lifecycle

```
NORMAL ROUNDS (Auto Mode):
draft → active → finalizing → completed
                      ↓
                tiebreaker_pending → (resolve) → finalizing → completed

NORMAL ROUNDS (Manual Mode):
draft → active → expired_pending_finalization → pending_finalization → completed
                                    ↓
                              tiebreaker_pending → (resolve) → pending_finalization → completed

BULK ROUNDS:
draft → active → expired → completed
                    ↓
              (conflicts) → pending_tiebreakers → (resolve all) → completed
```

### Timer Display (Frontend)

```typescript
// Calculate time remaining
const now = new Date();
const endTime = new Date(round.endTime);
const diffMs = endTime.getTime() - now.getTime();

if (diffMs <= 0) {
  return 'EXPIRED';
}

const hours = Math.floor(diffMs / (1000 * 60 * 60));
const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

return `${hours}h ${minutes}m ${seconds}s`;
```

**Real-time Updates:**
```typescript
// Update every second
useEffect(() => {
  const interval = setInterval(() => {
    setTimeRemaining(calculateTimeRemaining(round.endTime));
  }, 1000);
  
  return () => clearInterval(interval);
}, [round.endTime]);
```

### Bulk Tiebreaker Timer

Bulk tiebreakers have a **24-hour safety limit**:

```typescript
// When creating bulk tiebreaker
const startTime = new Date();
const maxEndTime = new Date(startTime.getTime() + (24 * 60 * 60 * 1000));

await prisma.bulk_tiebreakers.create({
  data: {
    startTime: startTime,
    maxEndTime: maxEndTime,
    // ...
  }
});
```

**Auto-finalize when:**
1. Only 1 team remains active (primary trigger)
2. 24 hours elapsed (safety limit)

### Expiration Detection Query

```typescript
// Find expired active rounds
const expiredRounds = await prisma.rounds.findMany({
  where: {
    status: 'active',
    endTime: {
      lt: new Date() // Less than NOW()
    }
  },
  orderBy: {
    endTime: 'asc'
  }
});
```

**PostgreSQL automatically handles:**
- Timezone conversions (TIMESTAMPTZ)
- NOW() returns current UTC time
- Comparison works correctly across timezones

### Race Condition Prevention

**Problem:** Multiple requests try to finalize the same round simultaneously

**Solution:** Optimistic locking with status update

```typescript
// Try to acquire lock
const lockResult = await prisma.rounds.updateMany({
  where: {
    id: roundId,
    status: 'active' // Only update if still active
  },
  data: {
    status: 'finalizing',
    updatedAt: new Date()
  }
});

// Only one request will succeed
if (lockResult.count === 0) {
  // Another request already got it
  return { alreadyFinalized: true };
}

// This request has the lock - proceed with finalization
```

**Key Points:**
- Atomic operation (UPDATE with WHERE condition)
- Only first request changes status from 'active' to 'finalizing'
- Other requests see 0 rows updated and abort
- No explicit locks needed (database handles it)

### Notification System

When round expires and finalizes:

```typescript
// 1. Broadcast via Firebase Realtime DB (if using Firebase)
// await broadcastRoundUpdate(seasonId, roundId, {
//   status: 'completed',
//   finalized: true,
// });

// 2. Send FCM push notifications (if implemented)
// await sendNotificationToSeason(
//   {
//     title: '✅ Round Finalized!',
//     body: `Round ${roundNumber} results are in!`,
//     url: `/dashboard/team/auction-results`,
//     data: {
//       type: 'round_finalized',
//       roundId,
//       roundNumber
//     }
//   },
//   seasonId
// );

// 3. Generate news article (if implemented)
// await triggerNews('auction_highlights', {
//   season_id: seasonId,
//   round_id: roundId,
//   allocations: results
// });
```

**Note:** Firebase and FCM are optional. The system works with just the database.

### Database Schema Updates

Add finalization mode to rounds table:

```sql
ALTER TABLE rounds ADD COLUMN finalization_mode VARCHAR(20) DEFAULT 'auto';
-- Values: 'auto' | 'manual'
```

### Summary

**Timer System:**
- Rounds have `endTime` (UTC timestamp)
- System checks `endTime < NOW()` to detect expiration
- No active polling - relies on lazy evaluation + cron

**Auto-Finalization:**
1. **Lazy** (primary): Triggered when users access rounds
2. **Cron** (backup): Runs every 5 minutes via Vercel Cron
3. **Public** (redundancy): Called from public pages

**Finalization Modes:**
- **Auto**: Immediate finalization (default)
- **Manual**: Preview + approval workflow

**Race Conditions:**
- Prevented by optimistic locking
- Status update with WHERE condition
- Only one request succeeds

**Database Writes:**
- Timer check: 0 writes (just SELECT)
- Lock acquisition: 1 write (UPDATE status)
- Finalization: ~50-100 writes (batch operations)

---

## FINAL SUMMARY

This optimized auction system provides:

1. **80-85% Reduction in Database Writes**
   - Original: 1,024+ writes per round
   - Optimized: 150-200 writes per round

2. **Single Row Per Team Per Round**
   - All bids stored as encrypted JSON blob
   - Atomic UPSERT operations
   - No individual bid rows

3. **Automatic Timer System**
   - 3-layer redundancy (lazy + cron + public)
   - Race condition prevention
   - Manual approval mode available

4. **Complete Feature Set**
   - Normal rounds with encrypted bidding
   - Bulk rounds with fixed pricing
   - Tiebreaker resolution (normal + bulk)
   - Phase-based allocation
   - Reserve calculator
   - Slot validation

5. **Correct Database Integration**
   - Uses `base_players` for player master list
   - Uses `seasonal_player_stats` for season-specific data
   - Uses `transfer_history` for ownership tracking
   - Uses `season_teams.currentBudget` for budget management
   - Uses `financial_ledger` for transaction logging

6. **Multi-Layer Backup**
   - Primary: Database (team_round_bids)
   - Secondary: Audit log (optional)
   - Tertiary: JSON files (optional)

This system is production-ready and optimized for your Neon database constraints while maintaining all functionality from the original `auction_process.md`.
