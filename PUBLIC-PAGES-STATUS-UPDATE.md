# Public Pages Status Filter Update

## Summary
Updated all public-facing pages to filter `transfer_history` queries by `status: 'ACTIVE'` to ensure only current players are displayed (excluding released and swapped out players).

## Files Updated

### 1. `app/(public)/teams/page.tsx`
**Queries Updated:**
- Overall team player count: `transfer_history.count()` - Added `status: 'ACTIVE'`
- Overall team spent: `transfer_history.aggregate()` - Added `status: 'ACTIVE'`
- Season-specific player count: `transfer_history.count()` - Added `status: 'ACTIVE'`
- Season-specific spent: `transfer_history.aggregate()` - Added `status: 'ACTIVE'`
- Season total players: `transfer_history.count()` - Added `status: 'ACTIVE'`
- Season total spent: `transfer_history.aggregate()` - Added `status: 'ACTIVE'`

**Impact:** Teams page now shows accurate player counts and spending for both overall and season-specific views.

---

### 2. `app/(public)/seasons/[seasonId]/teams/page.tsx`
**Queries Updated:**
- Team player count: `transfer_history.count()` - Added `status: 'ACTIVE'`
- Team spent: `transfer_history.aggregate()` - Added `status: 'ACTIVE'`
- Season total spent: `transfer_history.aggregate()` - Added `status: 'ACTIVE'`
- Season total players: `transfer_history.count()` - Added `status: 'ACTIVE'`

**Impact:** Season teams page displays correct squad sizes and budgets for each team.

---

### 3. `app/(public)/players/page.tsx`
**Queries Updated:**
- Sold players count: `transfer_history.count()` - Added `status: 'ACTIVE'`
- Teams filter: `teams.findMany()` with `transferHistory.some()` - Added `status: 'ACTIVE'`

**Impact:** Player search page shows accurate sold/available counts and team filters.

---

### 4. `app/(public)/page.tsx` (Homepage)
**Queries Updated:**
- Recent transfers: `transfer_history.findMany()` - Added `status: 'ACTIVE'`

**Impact:** Homepage only displays active transfers in the recent transfers section.

---

### 5. `app/(public)/auctions/rounds/[roundId]/page.tsx`
**Queries Updated:**
- Round results: `transfer_history.findMany()` - Added `status: 'ACTIVE'`

**Impact:** Round detail pages show only active player acquisitions from that round.

---

### 6. `app/(public)/auctions/results/page.tsx`
**Queries Updated:**
- All auction results: `transfer_history.findMany()` - Added `status: 'ACTIVE'`

**Impact:** Auction results page displays only currently active transfers.

---

## Total Changes
- **6 files updated**
- **14 queries modified** to include `status: 'ACTIVE'` filter
- **0 build errors** - Production build successful

## Testing Checklist
- [ ] Teams page shows correct player counts (excluding released players)
- [ ] Season teams page displays accurate squad sizes
- [ ] Players page sold count matches active transfers only
- [ ] Homepage recent transfers shows only active transfers
- [ ] Round detail pages show correct results
- [ ] Auction results page displays only active transfers
- [ ] Team budgets and spending calculations are accurate

## Related Files
- `prisma/schema.prisma` - Contains `TransferStatus` enum and status column definition
- `scripts/add-transfer-status-column.sql` - Migration script (ready to run)
- `PLAYER-RELEASE-PROCESS.md` - Documentation on release process
- `PLAYER-SWAP-SYSTEM.md` - Documentation on swap system

## Notes
- All queries now filter by `status: 'ACTIVE'` to show only current squad members
- Released players (`status: 'RELEASED'`) are excluded from counts and displays
- Swapped out players (`status: 'SWAPPED_OUT'`) are excluded from counts and displays
- Historical records are preserved in the database but not shown in public views
- Admin tools can still access full transfer history including non-active records
