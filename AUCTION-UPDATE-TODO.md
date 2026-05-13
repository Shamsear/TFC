# Auction Update - Remaining Frontend Work

## Summary
Backend validation and logic is complete. Need to add UI components to display warnings, reserve information, and squad status to users across all bidding interfaces.

## ✅ Completed

### Backend
- [x] Database schema migration (`scripts/add-min-max-squad-size.sql`)
- [x] Squad size validator (`lib/squad-size-validator.ts`)
- [x] Advanced reserve calculator (`lib/auction/reserve-calculator-v2.ts`)
- [x] Bulk tiebreaker balance checks (`lib/auction/finalize-bulk-tiebreaker.ts`)
- [x] Bulk round selection validation (`app/api/team/bulk-rounds/[id]/select/route.ts`)
- [x] Super admin season creation form (`app/(admin)/super-admin/seasons/new/page.tsx`)
- [x] Seasons API with auction_settings creation (`app/api/seasons/route.ts`)

### Frontend (Partial)
- [x] BulkRoundSelectionClient - Added squad status warning/info
- [x] BulkTiebreakerBiddingClient - Added reserve info display
- [x] TiebreakerBiddingClient - Added reserve info display ✅ NEW
- [x] API endpoint: `/api/team/squad-info` - Get squad size info
- [x] API endpoint: `/api/team/reserve-info` - Get reserve info

## 🔲 TODO - Frontend Components (Optional)

### 1. Normal Round Bidding (`components/team-auction/NormalRoundBiddingClient.tsx`) - OPTIONAL
**Add:**
- Reserve information display for each player bid
- Show available budget after reserves
- Warning banner if total bids would exceed reserves
- Phase indicator and calculation explanation

**Location:** Top of page, before player list

**Note:** Backend validation will catch reserve violations. This is just for better UX.

### 2. Round Bidding Client (`components/team-auction/RoundBiddingClient.tsx`) - OPTIONAL
**Add:**
- Reserve information display (similar to BulkTiebreakerBiddingClient)
- Show max bid, required reserve, phase info
- Warning if bid exceeds recommended limit (Phase 2)
- Color-coded by phase (red=Phase 1, amber=Phase 2, blue=Phase 3)

**Location:** After stats grid, before bidding form

### 2. Normal Round Bidding (`components/team-auction/NormalRoundBiddingClient.tsx`)
**Add:**
- Reserve information display for each player bid
- Show available budget after reserves
- Warning banner if total bids would exceed reserves
- Phase indicator and calculation explanation

**Location:** Top of page, before player list

### 3. Round Bidding Client (`components/team-auction/RoundBiddingClient.tsx`)
**Add:**
- Reserve information display
- Budget breakdown showing:
  - Total budget
  - Required reserve
  - Available for bidding
- Phase-based warnings
- Calculation explanation

**Location:** In header section with stats

## Implementation Pattern

### Reserve Info Display Component (Reusable)
```tsx
{reserveInfo && (
  <div className={`rounded-lg border p-4 ${
    reserveInfo.phase === 'phase_1' 
      ? 'bg-red-500/10 border-red-500/30'
      : reserveInfo.phase === 'phase_2'
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-blue-500/10 border-blue-500/30'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        reserveInfo.phase === 'phase_1' 
          ? 'bg-red-500/20 text-red-300'
          : reserveInfo.phase === 'phase_2'
          ? 'bg-amber-500/20 text-amber-300'
          : 'bg-blue-500/20 text-blue-300'
      }`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className={`text-sm font-bold mb-1 ${
          reserveInfo.phase === 'phase_1' 
            ? 'text-red-300'
            : reserveInfo.phase === 'phase_2'
            ? 'text-amber-300'
            : 'text-blue-300'
        }`}>
          Budget Reserve - {reserveInfo.phase === 'phase_1' ? 'Phase 1 (Strict)' : reserveInfo.phase === 'phase_2' ? 'Phase 2 (Soft)' : 'Phase 3 (Flexible)'}
        </h3>
        <div className="space-y-1 text-xs text-white/80">
          <p><strong>Required Reserve:</strong> £{reserveInfo.floorReserve.toLocaleString()}</p>
          <p><strong>Maximum Bid:</strong> £{reserveInfo.maxBid.toLocaleString()}</p>
          {reserveInfo.phase === 'phase_2' && reserveInfo.maxRecommendedBid < reserveInfo.maxBid && (
            <p className="text-amber-300"><strong>Recommended Max:</strong> £{reserveInfo.maxRecommendedBid.toLocaleString()}</p>
          )}
          <p className="text-white/60 text-xs mt-1">{reserveInfo.calculation}</p>
        </div>
      </div>
    </div>
  </div>
)}
```

### Fetch Reserve Info Pattern
```tsx
const [reserveInfo, setReserveInfo] = useState<any>(null)

useEffect(() => {
  async function fetchReserveInfo() {
    try {
      const response = await fetch(`/api/team/reserve-info?season_id=${seasonId}&round_id=${roundId}`)
      if (response.ok) {
        const data = await response.json()
        setReserveInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch reserve info:', error)
    }
  }
  fetchReserveInfo()
}, [seasonId, roundId])
```

### Squad Info Display Pattern (for bulk rounds)
```tsx
{squadInfo && (
  <div className={`rounded-xl border p-6 ${
    squadInfo.currentSquadSize < squadInfo.minSquadSize
      ? 'bg-amber-500/10 border-amber-500/30'
      : 'bg-blue-500/10 border-blue-500/30'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        squadInfo.currentSquadSize < squadInfo.minSquadSize
          ? 'bg-amber-500/20 text-amber-300'
          : 'bg-blue-500/20 text-blue-300'
      }`}>
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className={`text-lg font-bold mb-2 ${
          squadInfo.currentSquadSize < squadInfo.minSquadSize
            ? 'text-amber-300'
            : 'text-blue-300'
        }`}>
          Squad Size Status
        </h3>
        <div className="space-y-2 text-sm text-white/80">
          <p>
            <strong>Current Squad:</strong> {squadInfo.currentSquadSize} / {squadInfo.minSquadSize} (min) - {squadInfo.maxSquadSize} (max)
          </p>
          {squadInfo.currentSquadSize < squadInfo.minSquadSize ? (
            <p className="text-amber-300 font-medium">
              ⚠️ You must select exactly <strong>{squadInfo.slotsToMin} player{squadInfo.slotsToMin !== 1 ? 's' : ''}</strong> to reach the minimum squad size.
            </p>
          ) : (
            <p className="text-blue-300 font-medium">
              ✅ Minimum squad size reached! You can select 0-{squadInfo.slotsToMax} more player{squadInfo.slotsToMax !== 1 ? 's' : ''} (optional).
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

## Testing Checklist

After implementing all frontend components:

### Visual Testing
- [ ] Reserve info displays correctly in all phases
- [ ] Colors match phase (red/amber/blue)
- [ ] Squad status shows correct min/max values
- [ ] Warnings appear when appropriate
- [ ] Mobile responsive layout works

### Functional Testing
- [ ] Reserve info updates when round changes
- [ ] Squad info updates when selections change
- [ ] Bid validation respects reserve limits
- [ ] Error messages are clear and helpful
- [ ] Submit buttons disabled when invalid

### Phase-Specific Testing
- [ ] Phase 1: Strict enforcement, no skip allowed
- [ ] Phase 2: Floor enforcement, warnings for recommended
- [ ] Phase 3: Flexible after min squad reached
- [ ] Reserve calculations match backend

## Files to Modify

1. `components/team-auction/TiebreakerBiddingClient.tsx`
2. `components/team-auction/NormalRoundBiddingClient.tsx`
3. `components/team-auction/RoundBiddingClient.tsx`

## Estimated Time
- Each component: ~30 minutes
- Testing: ~1 hour
- **Total: ~2.5 hours**

## Notes
- All API endpoints are ready (`/api/team/reserve-info`, `/api/team/squad-info`)
- Backend validation is complete and working
- Pattern is established in BulkTiebreakerBiddingClient and BulkRoundSelectionClient
- Just need to copy/adapt the pattern to remaining components
