# Team Release Statistics - Expandable Section

## Overview
Added an expandable/collapsible section that displays release usage statistics for ALL teams in the season, providing a comprehensive overview of each team's release request status.

## Feature Details

### Location
- Appears below the main stats cards (Pending/Approved/Rejected)
- Above the pending requests section
- Always visible as a collapsed button

### Collapsed State
```
┌─────────────────────────────────────────────────┐
│ 📊 Team Release Statistics                     │
│ View release usage for all 12 teams         ▼  │
└─────────────────────────────────────────────────┘
```

### Expanded State
Shows a grid of cards (3 columns on desktop, 2 on tablet, 1 on mobile) with detailed stats for each team.

## Team Card Information

Each team card displays:

### Header Section
- **Team Logo**: 40x40px logo image
- **Team Name**: Full team name (truncated if too long)
- **Current Budget**: Formatted with commas (e.g., £2,000,000)

### Statistics Section
- **Total Requests**: X/3 (red if 3, white otherwise)
- **Approved**: X/3 (red if 3, green otherwise)
- **Pending**: Count (yellow)
- **Rejected**: Count (red)
- **Remaining Slots**: How many requests left (blue if available, red if 0)

### Status Badges
- **"LIMIT REACHED"**: Red badge when totalRequests >= 3
- **"NO REQUESTS"**: Gray badge when totalRequests = 0

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Team Release Statistics                                  │
│ View release usage for all 12 teams                      ▲  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ 🏆 Team A    │ │ 🏆 Team B    │ │ 🏆 Team C    │       │
│ │ £2,000,000   │ │ £1,500,000   │ │ £3,000,000   │       │
│ │              │ │              │ │              │       │
│ │ Total: 3/3   │ │ Total: 2/3   │ │ Total: 0/3   │       │
│ │ Approved:2/3 │ │ Approved:1/3 │ │ Approved:0/3 │       │
│ │ Pending: 1   │ │ Pending: 1   │ │ Pending: 0   │       │
│ │ Rejected: 0  │ │ Rejected: 0  │ │ Rejected: 0  │       │
│ │              │ │              │ │              │       │
│ │ Remaining: 0 │ │ Remaining: 1 │ │ Remaining: 3 │       │
│ │              │ │              │ │              │       │
│ │ LIMIT REACHED│ │              │ │ NO REQUESTS  │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                             │
│ [... more teams ...]                                        │
└─────────────────────────────────────────────────────────────┘
```

## Data Fetching

### Server-Side (Page Component)

```typescript
// Get ALL teams in this season
const allSeasonTeams = await prisma.season_teams.findMany({
  where: { seasonId },
  include: {
    team: {
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
    },
  },
  orderBy: {
    team: { name: 'asc' },
  },
})

// Calculate release stats for each team
const teamStats = allSeasonTeams.map(st => {
  const teamRequests = requests.filter(r => r.teamId === st.teamId)
  const totalRequests = teamRequests.length
  const approvedReleases = teamRequests.filter(r => r.status === 'approved').length
  const pendingRequests = teamRequests.filter(r => r.status === 'pending').length
  const rejectedRequests = teamRequests.filter(r => r.status === 'rejected').length

  return {
    teamId: st.teamId,
    teamName: st.team.name,
    teamLogo: st.team.logoUrl,
    currentBudget: st.currentBudget,
    totalRequests,
    approvedReleases,
    pendingRequests,
    rejectedRequests,
    remainingRequests: 3 - totalRequests,
    remainingApprovals: 3 - approvedReleases,
  }
})
```

## Statistics Explained

### Total Requests (X/3)
- Counts ALL requests regardless of status
- Includes pending, approved, and rejected
- Maximum is 3 per team
- **Red** when limit reached (3/3)
- **White** otherwise

### Approved (X/3)
- Counts only approved releases
- Maximum is 3 per team
- **Red** when limit reached (3/3)
- **Green** otherwise

### Pending
- Count of requests awaiting admin action
- **Yellow** color
- No limit (but total requests limited to 3)

### Rejected
- Count of rejected requests
- **Red** color
- Still counts toward total requests limit

### Remaining Slots
- Calculated as: 3 - totalRequests
- Shows how many more requests team can submit
- **Blue** when available
- **Red** when 0

## Use Cases

### For Admins

1. **Quick Overview**: See all teams at a glance
2. **Identify Issues**: Spot teams at limit
3. **Fair Distribution**: Ensure all teams aware of limits
4. **Planning**: See which teams haven't used releases
5. **Monitoring**: Track release usage across season

### Scenarios

**Scenario 1: Team at Limit**
```
Team A
Total: 3/3 ← Red
Approved: 2/3
Pending: 1
Rejected: 0
Remaining: 0 ← Red
[LIMIT REACHED] ← Red badge
```
→ Team cannot submit more requests

**Scenario 2: Team with Rejections**
```
Team B
Total: 3/3 ← Red
Approved: 0/3
Pending: 0
Rejected: 3 ← All rejected
Remaining: 0 ← Red
[LIMIT REACHED] ← Red badge
```
→ Team stuck, all requests rejected

**Scenario 3: Team Not Using Feature**
```
Team C
Total: 0/3
Approved: 0/3
Pending: 0
Rejected: 0
Remaining: 3 ← Blue
[NO REQUESTS] ← Gray badge
```
→ Team hasn't submitted any requests

**Scenario 4: Normal Usage**
```
Team D
Total: 2/3
Approved: 1/3
Pending: 1
Rejected: 0
Remaining: 1 ← Blue
```
→ Team using feature normally

## Benefits

### Transparency
- All teams visible
- No hidden information
- Fair and equal view

### Efficiency
- Quick scan of all teams
- No need to check individually
- Expandable to save space

### Monitoring
- Track usage patterns
- Identify teams needing help
- Spot potential issues

### Planning
- See overall release activity
- Understand season trends
- Make informed decisions

## Technical Implementation

### State Management
```typescript
const [showTeamStats, setShowTeamStats] = useState(false)
```

### Toggle Function
```typescript
<button onClick={() => setShowTeamStats(!showTeamStats)}>
  {/* Button content */}
</button>
```

### Conditional Rendering
```typescript
{showTeamStats && (
  <div className="mt-4">
    {/* Team stats grid */}
  </div>
)}
```

### Responsive Grid
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {teamStats.map(team => (
    // Team card
  ))}
</div>
```

## Color Coding

### Status Colors
- 🔴 **Red**: Limits reached, warnings
- 🟢 **Green**: Approved releases
- 🟡 **Yellow**: Pending requests
- 🔵 **Blue**: Available slots
- ⚪ **White**: Normal values
- ⚫ **Gray**: No activity

### When Colors Appear
- **Red Text**: totalRequests >= 3, approvedReleases >= 3, remainingSlots = 0
- **Green Text**: Approved count (when < 3)
- **Yellow Text**: Pending count
- **Blue Text**: Remaining slots (when > 0)

## Sorting

Teams are sorted alphabetically by name:
```typescript
orderBy: {
  team: { name: 'asc' }
}
```

This makes it easy to find specific teams.

## Performance

### Efficient Queries
- Single query for all season teams
- Calculations done in memory
- No N+1 query problems

### Data Size
- Typical season: 10-20 teams
- Each card: ~200 bytes
- Total data: ~4KB
- Very lightweight

## Files Modified

1. **app/(admin)/sub-admin/[seasonId]/tools/release-requests/page.tsx**
   - Added query for all season teams
   - Added team stats calculation
   - Passed teamStats to client

2. **components/admin/ReleaseRequestsAdminClient.tsx**
   - Added TeamStats interface
   - Added showTeamStats state
   - Added expandable section UI
   - Added team cards grid

## Testing Checklist

### Functionality
- [ ] Section expands on click
- [ ] Section collapses on click
- [ ] Arrow icon rotates
- [ ] All teams displayed
- [ ] Stats calculated correctly

### Data Accuracy
- [ ] Total requests count correct
- [ ] Approved count correct
- [ ] Pending count correct
- [ ] Rejected count correct
- [ ] Remaining slots correct
- [ ] Budget displayed correctly

### Visual
- [ ] Team logos display
- [ ] Team names display (truncated if long)
- [ ] Colors correct (red/green/yellow/blue)
- [ ] Badges show when appropriate
- [ ] Grid responsive (3/2/1 columns)

### Edge Cases
- [ ] Team with 0 requests shows "NO REQUESTS"
- [ ] Team with 3 requests shows "LIMIT REACHED"
- [ ] Team with all rejected shows correctly
- [ ] Team with no logo handles gracefully
- [ ] Long team names truncate properly

## Future Enhancements

1. **Sorting Options**: Sort by name, requests, approved, etc.
2. **Filtering**: Show only teams at limit, or with pending
3. **Search**: Find specific team quickly
4. **Export**: Download stats as CSV
5. **Charts**: Visual representation of usage
6. **Comparison**: Compare teams side-by-side
7. **History**: Show previous seasons
8. **Alerts**: Highlight teams needing attention
