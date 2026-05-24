# Admin Release Requests Page - Improvements

## Changes Made

### 1. ✅ Player Photos Fixed
**Issue:** Player photos were not showing
**Solution:** Added `unoptimized` prop to all Image components

```tsx
<Image
  src={getPlayerPhotoUrl(`${request.playerPhotoId}.webp`)}
  alt={request.playerName}
  fill
  className="object-cover"
  unoptimized  // ← Added this
/>
```

### 2. ✅ Grouped by Teams
**Issue:** All requests were shown in a flat list
**Solution:** Grouped pending requests by team for better organization

**Before:**
```
Pending Requests
├─ Player A (Team 1)
├─ Player B (Team 2)
├─ Player C (Team 1)
└─ Player D (Team 3)
```

**After:**
```
Pending Requests
├─ Team 1
│  ├─ Player A
│  └─ Player C
├─ Team 2
│  └─ Player B
└─ Team 3
   └─ Player D
```

Each team section shows:
- Team logo and name
- Number of requests
- All their pending requests

### 3. ✅ Currency Format Fixed
**Issue:** Showing "1k" instead of "1000"
**Solution:** Changed currency formatting to show full numbers with commas

**Before:**
```typescript
formatCurrency(1000) → "£1K"
formatCurrency(500000) → "£500K"
formatCurrency(1500000) → "£1.50M"
```

**After:**
```typescript
formatCurrency(1000) → "£1,000"
formatCurrency(500000) → "£500,000"
formatCurrency(1500000) → "£1,500,000"
```

### 4. ✅ Individual Approval Buttons
**Issue:** Already implemented, but needed budget info
**Solution:** Each request has its own "Approve & Release" button

Benefits:
- Admin can approve one at a time
- Faster processing
- Ledger entries created sequentially
- No bulk operations that could fail partially

### 5. ✅ Budget Information Displayed
**Issue:** No visibility of budget impact
**Solution:** Added budget display for each request showing:

```
┌─────────────────────────────────────────┐
│ Refund          │ £500,000              │
│ Current Budget  │ £2,000,000            │
│ New Budget      │ £2,500,000            │
└─────────────────────────────────────────┘
```

**Implementation:**
- Fetches current team budgets from `season_teams`
- Calculates new budget (current + refund)
- Shows all three values for transparency

## UI Layout

### Pending Requests Section

```
┌─────────────────────────────────────────────────────────┐
│ 🏆 Team Name                                            │
│ 2 requests                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📷 Player A                                     │   │
│ │ Submitted: 24 May 2026, 10:30                   │   │
│ │                                                 │   │
│ │ Refund: £500,000                                │   │
│ │ Current Budget: £2,000,000                      │   │
│ │ New Budget: £2,500,000                          │   │
│ │                                                 │   │
│ │ [Approve & Release] [Reject]                    │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 📷 Player B                                     │   │
│ │ ...                                             │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Benefits of Grouping

1. **Better Organization**: Easy to see which teams have requests
2. **Team Context**: See all requests from same team together
3. **Faster Processing**: Process all requests for one team at once
4. **Budget Visibility**: See team's budget impact clearly

## Technical Implementation

### Data Fetching (Server Side)

```typescript
// Fetch team budgets
const teamIds = [...new Set(requests.map(r => r.teamId))]
const seasonTeams = await prisma.season_teams.findMany({
  where: {
    seasonId,
    teamId: { in: teamIds },
  },
  select: {
    teamId: true,
    currentBudget: true,
  },
})

// Map budgets to requests
const transformedRequests = requests.map(req => ({
  ...req,
  currentBudget: teamBudgets[req.teamId] || 0,
  newBudget: (teamBudgets[req.teamId] || 0) + req.refundAmount,
}))
```

### Grouping (Client Side)

```typescript
// Group pending requests by team
const pendingByTeam = pendingRequests.reduce((acc, request) => {
  if (!acc[request.teamId]) {
    acc[request.teamId] = {
      teamId: request.teamId,
      teamName: request.teamName,
      teamLogo: request.teamLogo,
      requests: [],
    }
  }
  acc[request.teamId].requests.push(request)
  return acc
}, {} as Record<string, TeamGroup>)

const teamGroups = Object.values(pendingByTeam)
```

## Approval Flow

### Individual Approval Process

1. Admin clicks "Approve & Release" for a specific player
2. Confirmation dialog shows
3. API processes the release:
   - Updates `transfer_history` status to 'RELEASED'
   - Refunds team budget
   - Creates ledger entry
   - Updates request status to 'approved'
4. UI updates to show success
5. Request moves to "Processed Requests" section

### Sequential Processing

Each approval is independent:
- ✅ No batch operations
- ✅ Each has its own transaction
- ✅ Ledger entries created one by one
- ✅ If one fails, others unaffected

## Files Modified

1. **app/(admin)/sub-admin/[seasonId]/tools/release-requests/page.tsx**
   - Added team budget fetching
   - Added budget calculations to transformed data

2. **components/admin/ReleaseRequestsAdminClient.tsx**
   - Fixed currency formatting (removed K/M abbreviations)
   - Added `unoptimized` to Image components
   - Grouped pending requests by team
   - Added budget display (refund, current, new)
   - Improved UI layout

## Testing Checklist

### Visual
- [ ] Player photos display correctly
- [ ] Team logos display correctly
- [ ] Currency shows full numbers (e.g., "£1,000" not "£1K")
- [ ] Requests grouped by team
- [ ] Budget info shows for each request

### Functional
- [ ] Individual approval works
- [ ] Budget updates correctly after approval
- [ ] Ledger entry created
- [ ] Request moves to processed section
- [ ] Rejection still works
- [ ] Window toggle still works

### Data Accuracy
- [ ] Current budget matches database
- [ ] New budget calculation correct
- [ ] Refund amount accurate
- [ ] Multiple teams show correct budgets

## Future Enhancements

1. **Bulk Approve by Team**: Add button to approve all requests for a team
2. **Budget Warnings**: Highlight if new budget exceeds certain threshold
3. **Request History**: Show previous releases for context
4. **Export**: Download release report as CSV
5. **Notifications**: Email teams when requests are processed
