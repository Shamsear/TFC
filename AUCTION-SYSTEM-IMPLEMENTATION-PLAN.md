# Auction System Implementation Plan

## Overview
Replace the current admin manual allocation system with a comprehensive auction system featuring Normal Rounds (blind bidding), Bulk Rounds (fixed price), and Tiebreaker resolution.

---

## Phase 1: Database Schema

### New Tables Required

#### 1. `rounds` table
```sql
CREATE TABLE rounds (
  id VARCHAR(20) PRIMARY KEY, -- SSPSLFR00001 (normal), SSPSLFBR00001 (bulk)
  season_id VARCHAR(20) NOT NULL REFERENCES seasons(id),
  position VARCHAR(50), -- e.g., "ST", "LB,LWF"
  round_number INT NOT NULL,
  round_type VARCHAR(10) NOT NULL, -- 'normal' | 'bulk'
  max_bids_per_team INT, -- for normal rounds
  base_price INT, -- for bulk rounds
  duration_seconds INT NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(30) DEFAULT 'draft', -- draft/active/expired/tiebreaker_pending/completed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `bids` table (Normal Rounds)
```sql
CREATE TABLE bids (
  id VARCHAR(50) PRIMARY KEY, -- SSPSLT0001_SSPSLFR00001
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  encrypted_bid_data TEXT NOT NULL, -- JSON with player_id, amount
  status VARCHAR(20) DEFAULT 'pending', -- pending/active/won/lost
  phase VARCHAR(20) DEFAULT 'regular', -- open/regular/incomplete
  submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. `round_bids` table (Bulk Rounds)
```sql
CREATE TABLE round_bids (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  season_id VARCHAR(20) NOT NULL REFERENCES seasons(id),
  player_id VARCHAR(20) NOT NULL REFERENCES footballplayers(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  bid_amount INT NOT NULL, -- always base_price
  bid_time TIMESTAMP DEFAULT NOW(),
  is_winning BOOLEAN DEFAULT FALSE
);
```

#### 4. `round_players` table (Bulk Rounds)
```sql
CREATE TABLE round_players (
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  player_id VARCHAR(20) NOT NULL REFERENCES footballplayers(id),
  player_name VARCHAR(255) NOT NULL,
  position VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending/sold/unsold
  bid_count INT DEFAULT 0,
  winning_team_id VARCHAR(20) REFERENCES teams(id),
  winning_bid INT,
  PRIMARY KEY (round_id, player_id)
);
```

#### 5. `tiebreakers` table (Normal Round Tiebreakers)
```sql
CREATE TABLE tiebreakers (
  id VARCHAR(20) PRIMARY KEY, -- SSPSLTR00001
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  player_id VARCHAR(20) NOT NULL REFERENCES footballplayers(id),
  original_amount INT NOT NULL,
  tied_teams INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- active/resolved/excluded/tied_again
  winning_team_id VARCHAR(20) REFERENCES teams(id),
  winning_bid INT,
  duration_minutes INT, -- NULL = no limit
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 6. `team_tiebreakers` table
```sql
CREATE TABLE team_tiebreakers (
  id VARCHAR(50) PRIMARY KEY, -- SSPSLT0001_SSPSLTR00001
  tiebreaker_id VARCHAR(20) NOT NULL REFERENCES tiebreakers(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  old_bid_amount INT NOT NULL,
  new_bid_amount INT,
  submitted BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending', -- pending/resolved/excluded
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);
```

#### 7. `bulk_tiebreakers` table (Last Person Standing)
```sql
CREATE TABLE bulk_tiebreakers (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id),
  player_id VARCHAR(20) NOT NULL REFERENCES footballplayers(id),
  player_name VARCHAR(255) NOT NULL,
  base_price INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending/active/resolved/cancelled
  current_highest_bid INT,
  current_highest_team_id VARCHAR(20) REFERENCES teams(id),
  teams_remaining INT NOT NULL,
  start_time TIMESTAMP,
  last_activity_time TIMESTAMP,
  max_end_time TIMESTAMP, -- start + 24 hours
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### 8. `bulk_tiebreaker_teams` table
```sql
CREATE TABLE bulk_tiebreaker_teams (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL REFERENCES bulk_tiebreakers(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  status VARCHAR(20) DEFAULT 'active', -- active/withdrawn
  current_bid INT,
  joined_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP
);
```

#### 9. `bulk_tiebreaker_bids` table (Audit Trail)
```sql
CREATE TABLE bulk_tiebreaker_bids (
  id SERIAL PRIMARY KEY,
  tiebreaker_id INT NOT NULL REFERENCES bulk_tiebreakers(id),
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id),
  bid_amount INT NOT NULL,
  bid_time TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2: Core Library Functions

### 1. `lib/encryption.ts`
- `encryptBidData(data)` - Encrypt bid data using AES-256-GCM
- `decryptBidData(encrypted)` - Decrypt bid data

### 2. `lib/reserve-calculator.ts`
- `calculateReserveCore(round_number, balance, squad_size, config)` - Calculate minimum reserve
- Implements phase-based reserve requirements

### 3. `lib/finalize-round.ts`
- Main finalization algorithm for normal rounds
- Handles bid decryption, allocation, tiebreaker creation
- Phase-based non-submitted team handling

### 4. `lib/tiebreaker.ts`
- `createTiebreaker(round_id, player_id, tied_teams, original_amount)` - Create tiebreaker
- `resolveTiebreaker(tiebreaker_id)` - Resolve when all teams submit
- Handles recursive tiebreakers

### 5. `lib/finalize-bulk-tiebreaker.ts`
- Finalize bulk tiebreaker (last person standing)
- Allocate player to winner
- Update budgets and transactions

---

## Phase 3: API Routes

### Normal Rounds
1. **POST /api/admin/rounds** - Create normal round
2. **POST /api/admin/rounds/[id]/start** - Start round
3. **POST /api/admin/rounds/[id]/finalize** - Finalize round
4. **POST /api/auction/bids** - Team places bid
5. **POST /api/auction/bids/submit** - Team submits bids
6. **GET /api/auction/rounds/[id]** - Get round details

### Normal Tiebreakers
7. **GET /api/admin/tiebreakers** - List all tiebreakers
8. **POST /api/tiebreakers/[id]/submit** - Team submits new bid
9. **GET /api/tiebreakers/[id]** - Get tiebreaker details

### Bulk Rounds
10. **POST /api/admin/bulk-rounds** - Create bulk round
11. **POST /api/admin/bulk-rounds/[id]/start** - Start round
12. **POST /api/admin/bulk-rounds/[id]/finalize** - Finalize round
13. **POST /api/team/bulk-rounds/[id]/bids** - Place bid
14. **DELETE /api/team/bulk-rounds/[id]/bids** - Remove bid
15. **GET /api/team/bulk-rounds/[id]** - Get round details

### Bulk Tiebreakers
16. **POST /api/admin/bulk-rounds/[id]/create-tiebreaker** - Create tiebreaker
17. **GET /api/admin/bulk-tiebreakers** - List tiebreakers
18. **POST /api/team/bulk-tiebreakers/[id]/bid** - Place bid
19. **POST /api/team/bulk-tiebreakers/[id]/withdraw** - Withdraw
20. **POST /api/admin/bulk-tiebreakers/[id]/finalize** - Manual finalize
21. **GET /api/team/bulk-tiebreakers/[id]** - Get tiebreaker details

---

## Phase 4: Admin UI Components

### 1. Auction Dashboard (`app/(admin)/sub-admin/[seasonId]/auction/page.tsx`)
- View all rounds (normal + bulk)
- Create new rounds
- View round status
- Access tiebreakers

### 2. Normal Round Creator
- Select position(s)
- Set max bids per team
- Set duration
- Set round number

### 3. Bulk Round Creator
- Set base price
- Set duration
- Auto-adds all eligible players

### 4. Round Management
- Start round
- View bids (after finalization)
- Finalize round
- View results

### 5. Tiebreaker Management
- View all active tiebreakers
- View team submissions
- Manual resolution (if needed)

### 6. Bulk Tiebreaker Management
- Create tiebreaker for contested players
- View live bidding
- Monitor withdrawals
- Manual finalize (if needed)

---

## Phase 5: Team UI Components

### 1. Team Auction Dashboard (`app/(team)/team/auctions/page.tsx`)
- View active rounds
- View past rounds
- View tiebreakers

### 2. Normal Round Bidding Interface
- View available players
- Place encrypted bids (up to max_bids_per_team)
- Submit bids
- View countdown timer

### 3. Bulk Round Bidding Interface
- View all available players
- Select players at base price
- Submit selections
- View countdown timer

### 4. Normal Tiebreaker Interface
- View tied player
- View original bid
- Submit new bid
- Wait for resolution

### 5. Bulk Tiebreaker Interface (Last Person Standing)
- View current highest bid
- View active teams
- Place higher bid
- Withdraw option
- Real-time updates

---

## Phase 6: Real-time Features

### Firebase Realtime Database Structure
```
seasons/
  {seasonId}/
    rounds/
      {roundId}/
        status: "active"
        end_time: timestamp
        bids_count: number
    
    tiebreakers/
      {tiebreakerId}/
        status: "active"
        teams_submitted: number
        total_teams: number
    
    bulk_tiebreakers/
      {tiebreakerId}/
        current_highest_bid: number
        current_highest_team: string
        teams_remaining: number
        last_activity: timestamp
    
    teams/
      {teamId}/
        budget: number
        squad_count: number
```

### Broadcasting Functions
- `broadcastRoundUpdate(season_id, round_id, data)`
- `broadcastTiebreakerUpdate(season_id, tiebreaker_id, data)`
- `broadcastBulkTiebreakerUpdate(season_id, tiebreaker_id, data)`
- `broadcastSquadUpdate(season_id, team_id, data)`
- `broadcastWalletUpdate(season_id, team_id, data)`

---

## Phase 7: Migration Strategy

### Step 1: Add New Tables
- Run migration scripts to create all new tables
- Add indexes for performance

### Step 2: Keep Old System Running
- Don't delete old auction code immediately
- Run both systems in parallel during testing

### Step 3: Data Migration
- Migrate existing sold players to new format
- Update team budgets if needed

### Step 4: Feature Flag
- Add feature flag to toggle between old/new system
- Test new system thoroughly

### Step 5: Deprecate Old System
- Once new system is stable, remove old code
- Remove old API routes
- Update documentation

---

## Phase 8: Testing Checklist

### Normal Rounds
- [ ] Create round
- [ ] Teams place bids
- [ ] Teams submit bids
- [ ] Round expires
- [ ] Finalization allocates correctly
- [ ] Tiebreaker created for ties
- [ ] Tiebreaker resolution works
- [ ] Recursive tiebreakers work
- [ ] Phase 1 forced allocation
- [ ] Phase 2 skip allowed
- [ ] Phase 3 forced allocation
- [ ] Budget deduction correct
- [ ] Squad slots validated

### Bulk Rounds
- [ ] Create round
- [ ] Auto-add eligible players
- [ ] Teams place bids
- [ ] Single bidders get immediate allocation
- [ ] Conflicts marked correctly
- [ ] Manual tiebreaker creation
- [ ] Multiple players per team allowed
- [ ] Budget deduction correct
- [ ] Slot validation works

### Bulk Tiebreakers
- [ ] Create tiebreaker
- [ ] Teams can bid
- [ ] Bids must be higher
- [ ] Teams can withdraw
- [ ] Auto-finalize when 1 team left
- [ ] 24-hour safety limit
- [ ] Real-time updates work
- [ ] Winner gets player
- [ ] Budget deduction correct

### Edge Cases
- [ ] Team has insufficient budget
- [ ] Team has no available slots
- [ ] Round finalized twice (idempotency)
- [ ] All teams withdraw from bulk tiebreaker
- [ ] Network issues during bidding
- [ ] Concurrent bid submissions

---

## Phase 9: Documentation

### Admin Guide
- How to create normal rounds
- How to create bulk rounds
- How to manage tiebreakers
- Best practices for auction timing

### Team Guide
- How to place bids
- How to participate in tiebreakers
- Understanding reserve requirements
- Bidding strategies

### Developer Guide
- API documentation
- Database schema
- Real-time broadcasting
- Encryption details

---

## Implementation Priority

### High Priority (MVP)
1. Database schema
2. Normal round creation
3. Normal round bidding
4. Normal round finalization
5. Basic tiebreaker support
6. Admin UI for normal rounds
7. Team UI for normal rounds

### Medium Priority
8. Bulk rounds
9. Bulk tiebreakers
10. Real-time updates
11. Reserve calculator
12. Phase-based allocation

### Low Priority
13. Advanced analytics
14. Auction history
15. Bid recommendations
16. Mobile app support

---

## Estimated Timeline

- **Phase 1 (Database)**: 1-2 days
- **Phase 2 (Core Logic)**: 3-4 days
- **Phase 3 (API Routes)**: 4-5 days
- **Phase 4 (Admin UI)**: 5-6 days
- **Phase 5 (Team UI)**: 5-6 days
- **Phase 6 (Real-time)**: 2-3 days
- **Phase 7 (Migration)**: 2-3 days
- **Phase 8 (Testing)**: 3-4 days
- **Phase 9 (Documentation)**: 2-3 days

**Total**: 27-36 days (approximately 5-7 weeks)

---

## Next Steps

1. Review and approve this plan
2. Create database migration scripts
3. Implement core library functions
4. Build API routes incrementally
5. Create admin UI
6. Create team UI
7. Test thoroughly
8. Deploy to production

---

## Notes

- This is a complete replacement of the manual allocation system
- The new system is significantly more complex but provides better UX
- Real-time features require Firebase setup
- Encryption adds security but requires key management
- Tiebreakers add complexity but ensure fairness
- Testing is critical due to financial implications
