# Clean ID Migration Checklist

## 🎯 Overview
This checklist covers all files that need to be updated to use the new clean ID system.

## ✅ Step 1: Run Database Reset

```bash
npm run db:reset
```

This will:
- Delete all existing data
- Create Super Admin with ID `TFCU-1`
- Email: `admin@tfc.com`
- Password: `admin123`

## 📝 Step 2: Update All Files

### 🔧 Core Files (Already Updated)
- [x] `lib/id-generator.ts` - ID generation functions
- [x] `scripts/reset-database-with-clean-ids.ts` - Reset script
- [x] `package.json` - Added `db:reset` script

### 👤 User Management Files

#### API Routes
- [ ] `app/api/auth/register/route.ts`
  ```typescript
  import { generateUserId } from '@/lib/id-generator'
  const userId = await generateUserId()
  ```

#### Pages
- [ ] `app/(admin)/super-admin/sub-admins/new/page.tsx`
- [ ] `app/(admin)/super-admin/sub-admins/[id]/edit/page.tsx`

### 🏆 Season Management Files

#### API Routes
- [ ] `app/api/seasons/route.ts`
  ```typescript
  import { generateSeasonId } from '@/lib/id-generator'
  const seasonId = await generateSeasonId()
  ```

#### Pages
- [ ] `app/(admin)/super-admin/seasons/new/page.tsx`

### 🏅 Team Management Files

#### API Routes
- [ ] `app/api/teams/route.ts`
  ```typescript
  import { generateTeamId } from '@/lib/id-generator'
  const teamId = await generateTeamId()
  ```

#### Pages
- [ ] `app/(admin)/super-admin/teams/new/page.tsx`
- [ ] `app/(admin)/super-admin/teams/[teamId]/edit/page.tsx`

### ⚽ Player Management Files

#### API Routes
- [ ] `app/api/players/route.ts`
  ```typescript
  import { generatePlayerId, generatePlayerStatsId } from '@/lib/id-generator'
  const playerId = await generatePlayerId()
  const statsId = await generatePlayerStatsId()
  ```

- [ ] `app/api/import/route.ts` - **CRITICAL** for player imports
- [ ] `app/api/seasons/[seasonId]/players/route.ts`

#### Components
- [ ] `components/import/ImportWizard.tsx` - Player import logic

### 🏟️ Tournament Management Files

#### API Routes
- [ ] `app/api/tournaments/route.ts`
  ```typescript
  import { 
    generateTournamentId,
    generateTournamentTeamId,
    generateGroupId,
    generateStandingId
  } from '@/lib/id-generator'
  ```

- [ ] `app/api/tournaments/[tournamentId]/route.ts`

#### Pages
- [ ] `app/(admin)/sub-admin/[seasonId]/tournaments/new/page.tsx`
- [ ] `app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/page.tsx`

### 🎯 Match/Fixture Management Files

#### API Routes
- [ ] `app/api/matches/route.ts`
  ```typescript
  import { generateMatchId } from '@/lib/id-generator'
  const matchId = await generateMatchId()
  ```

- [ ] `app/api/fixtures/route.ts`

#### Pages
- [ ] `app/(admin)/sub-admin/[seasonId]/tournaments/[tournamentId]/fixtures/new/page.tsx`

### 💰 Auction/Transfer Files

#### API Routes
- [ ] `app/api/auction/route.ts`
  ```typescript
  import { 
    generateAuctionId,
    generateAuctionSlotId,
    generateTransferId,
    generateSeasonTeamId,
    generateFinancialId
  } from '@/lib/id-generator'
  ```

- [ ] `app/api/auction/sold/route.ts`
- [ ] `app/api/transfers/route.ts`
- [ ] `app/api/seasons/[seasonId]/auction/route.ts`
- [ ] `app/api/seasons/[seasonId]/auction/sold/route.ts`

#### Pages
- [ ] `app/(admin)/sub-admin/[seasonId]/auction/page.tsx`
- [ ] `app/(admin)/sub-admin/[seasonId]/transfers/page.tsx`

### 🔄 Retention Files

#### API Routes
- [ ] `app/api/retention/route.ts`
  ```typescript
  import { generateRetentionId } from '@/lib/id-generator'
  const retentionId = await generateRetentionId()
  ```

#### Pages
- [ ] `app/(admin)/sub-admin/[seasonId]/retention/page.tsx`

### 📊 Financial Files

#### API Routes
- [ ] `app/api/financial/route.ts`
  ```typescript
  import { generateFinancialId } from '@/lib/id-generator'
  const financialId = await generateFinancialId()
  ```

### 📝 Audit Log Files

#### API Routes
- [ ] `app/api/audit/route.ts`
  ```typescript
  import { generateAuditId } from '@/lib/id-generator'
  const auditId = await generateAuditId()
  ```

### 🎪 Calendar/Event Files

#### API Routes
- [ ] `app/api/calendar/route.ts`
  ```typescript
  import { generateAuctionId } from '@/lib/id-generator'
  ```

#### Pages
- [ ] `app/(admin)/sub-admin/[seasonId]/calendar/new/page.tsx`

## 🔍 Search and Replace Patterns

### Pattern 1: UUID Generation
**Find:**
```typescript
crypto.randomUUID()
```

**Replace with appropriate generator:**
```typescript
await generatePlayerId()  // or appropriate generator
```

### Pattern 2: Direct ID Assignment
**Find:**
```typescript
id: crypto.randomUUID()
```

**Replace:**
```typescript
const newId = await generatePlayerId() // or appropriate generator
// ... then use:
id: newId
```

### Pattern 3: Prisma Create with UUID
**Find:**
```typescript
await prisma.base_players.create({
  data: {
    id: crypto.randomUUID(),
    // ...
  }
})
```

**Replace:**
```typescript
const playerId = await generatePlayerId()
await prisma.base_players.create({
  data: {
    id: playerId,
    // ...
  }
})
```

## 🧪 Testing Checklist

After updating all files, test these features:

- [ ] User registration/creation
- [ ] Season creation
- [ ] Team creation
- [ ] Player import
- [ ] Tournament creation
- [ ] Match/fixture creation
- [ ] Auction functionality
- [ ] Transfer functionality
- [ ] Retention functionality
- [ ] Financial transactions
- [ ] Audit logging

## 📋 Verification Steps

1. **Check Database IDs:**
   ```sql
   SELECT id, name FROM users LIMIT 5;
   SELECT id, name FROM seasons LIMIT 5;
   SELECT id, name FROM teams LIMIT 5;
   SELECT id, name FROM base_players LIMIT 5;
   ```

2. **Verify ID Format:**
   - Users: `TFCU-1`, `TFCU-2`, etc.
   - Seasons: `TFCS-1`, `TFCS-2`, etc.
   - Teams: `TFCM-1`, `TFCM-2`, etc.
   - Players: `TFCP-1`, `TFCP-2`, etc.

3. **Test URL Structure:**
   - `/players/TFCP-1` should work
   - `/seasons/TFCS-1` should work
   - `/teams/TFCM-1` should work

## ⚠️ Important Notes

1. **Backup First:** Always backup production data before migration
2. **Test Thoroughly:** Test all features after migration
3. **Update Images:** Ensure player images use `player_id` field
4. **Foreign Keys:** All foreign key relationships will use new IDs
5. **Sequential IDs:** IDs are sequential and human-readable

## 🚀 Quick Start Commands

```bash
# 1. Reset database
npm run db:reset

# 2. Start development server
npm run dev

# 3. Login with:
#    Email: admin@tfc.com
#    Password: admin123

# 4. Change password immediately!
```

## 📞 Support

If you encounter issues:
1. Check console for errors
2. Verify ID format matches pattern
3. Ensure all imports are correct
4. Check foreign key relationships
