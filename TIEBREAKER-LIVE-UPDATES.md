# Tiebreaker Live Update System

This document explains how the bulk tiebreaker pages implement real-time updates for both team managers and administrators.

## Overview

The live update system uses **HTTP Short-Polling** to automatically fetch the latest tiebreaker data every **2-3 seconds** without requiring manual page refreshes. This provides a near-real-time experience for bidding and monitoring.

**Important:** Admins start each bulk tiebreaker **one at a time** to avoid confusion. Only one bulk tiebreaker should be active at any given moment, ensuring teams can focus on bidding for one player without being overwhelmed by multiple simultaneous auctions.

## Admin Workflow

### Starting Bulk Tiebreakers

Admins create and start bulk tiebreakers **one at a time** through the admin interface:

1. **Create Tiebreaker:** Admin selects a player and the tied teams
2. **Start Timer:** The 24-hour countdown begins immediately upon creation
3. **Monitor Live:** Admin watches the bidding in real-time on the monitor page
4. **Wait for Resolution:** Once resolved (winner determined or timer expires), admin can start the next tiebreaker

**Why One at a Time?**
- Prevents team confusion (teams know exactly which player to bid on)
- Easier for admin to monitor and manage
- Reduces server load from simultaneous auctions
- Creates focused, competitive bidding environment

## Architecture

### 1. Team Side (`/team/auction/bulk-tiebreakers/[id]`)

**Component:** `components/team-auction/BulkTiebreakerBiddingClient.tsx`

**Features:**
- Live bid updates every 3 seconds
- Automatic bid amount suggestions based on current highest bid
- Real-time participant status updates
- Live countdown timer
- Instant feedback after placing bids

**How It Works:**

```typescript
// Polling mechanism
useEffect(() => {
  const fetchLiveData = async () => {
    const response = await fetch(`/api/team/bulk-tiebreakers/${tiebreaker.id}`)
    if (response.ok) {
      const result = await response.json()
      setLiveData(result.tiebreaker)
    }
  }

  // Only poll if tiebreaker is active
  if (liveData.status === 'pending' && isPolling) {
    const interval = setInterval(fetchLiveData, 3000) // 3 seconds
    return () => clearInterval(interval)
  }
}, [tiebreaker.id, liveData.status, isPolling])
```

**Key Behaviors:**
- Polling starts immediately when page loads
- Polling continues only while tiebreaker status is 'pending'
- Polling stops when:
  - Tiebreaker is resolved
  - Timer expires
  - Team withdraws from bidding
- After placing a bid, data is immediately refreshed (no 3-second wait)

### 2. Admin Side (`/sub-admin/[seasonId]/auction-v2/bulk-tiebreakers/[id]`)

**Component:** `components/auction-v2/BulkTiebreakerMonitorClient.tsx`

**Features:**
- Live monitoring of all bids across all teams
- Real-time participant tracking
- Visual "LIVE" indicator when tiebreaker is active
- Last update timestamp
- Current leader highlighting
- Complete bid history with latest bid emphasized

**How It Works:**

```typescript
// Same polling mechanism as team side
useEffect(() => {
  const fetchLiveData = async () => {
    const response = await fetch(`/api/admin/bulk-tiebreakers/${initialData.id}`)
    if (response.ok) {
      const result = await response.json()
      setLiveData(result.tiebreaker)
      setLastUpdate(new Date())
    }
  }

  if (liveData.status === 'pending' && isPolling) {
    const interval = setInterval(fetchLiveData, 3000)
    return () => clearInterval(interval)
  }
}, [initialData.id, liveData.status, isPolling])
```

**Visual Indicators:**
- 🔴 Red pulsing "LIVE" badge when tiebreaker is active
- Green highlight for current leader
- Gold color for highest bid amounts
- Timestamp showing last data refresh

## API Endpoints

### Team API
**GET** `/api/team/bulk-tiebreakers/[id]`

Returns:
```json
{
  "success": true,
  "tiebreaker": {
    "id": 1,
    "basePrice": 50000,
    "status": "pending",
    "currentHighestBid": 75000,
    "currentHighestTeamId": "team-123",
    "teamsRemaining": 3,
    "participants": [...],
    "bidHistory": [...],
    "timeRemaining": {
      "milliseconds": 3600000,
      "seconds": 3600,
      "minutes": 60,
      "hours": 1
    }
  },
  "myParticipation": {...}
}
```

### Admin API
**GET** `/api/admin/bulk-tiebreakers/[id]`

Returns same structure as team API but includes all team details and extended bid history (50 bids vs 20).

## Performance Considerations

### Why 2-3 Seconds?

- **Fast enough:** Provides near-real-time updates for competitive bidding
- **Efficient:** Doesn't overload the server with excessive requests
- **Responsive:** Users see changes quickly without noticeable delay
- **Sequential tiebreakers:** Since only one bulk tiebreaker runs at a time, server load is predictable

### Optimization Techniques

1. **Conditional Polling:** Only polls when tiebreaker is active
2. **Automatic Cleanup:** Stops polling when component unmounts
3. **Smart State Updates:** Only updates UI when data actually changes
4. **Immediate Refresh:** After user actions (bid/withdraw), data refreshes instantly

### Server Load

With 10 teams bidding in **one active tiebreaker**:
- Requests per minute: 10 teams × 20-30 requests = 200-300 requests/min
- This is well within acceptable limits for modern servers
- Since tiebreakers run sequentially (one at a time), load never spikes from multiple simultaneous auctions

## User Experience Benefits

### For Team Managers:
✅ See competitor bids instantly
✅ Know immediately if outbid
✅ Bid faster with auto-suggested amounts
✅ No manual refresh needed
✅ Real-time countdown timer

### For Administrators:
✅ Monitor all tiebreakers in real-time
✅ See which teams are actively bidding
✅ Track bid progression live
✅ Identify when tiebreakers need resolution
✅ Complete audit trail of all bids

## Technical Implementation Details

### State Management

Both components use React's `useState` to manage:
- `liveData`: Current tiebreaker state
- `isPolling`: Whether polling is active
- `timeRemaining`: Formatted countdown string
- `lastUpdate`: Timestamp of last successful fetch (admin only)

### Timer Logic

Separate from polling, a 1-second interval updates the countdown:

```typescript
useEffect(() => {
  const updateTimer = () => {
    const diff = endTime.getTime() - now.getTime()
    if (diff > 0) {
      // Calculate hours, minutes, seconds
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
    } else {
      setTimeRemaining('Expired')
      setIsPolling(false) // Stop polling
    }
  }
  
  const interval = setInterval(updateTimer, 1000)
  return () => clearInterval(interval)
}, [liveData.maxEndTime])
```

### Error Handling

Polling failures are logged but don't break the UI:
```typescript
try {
  const response = await fetch(...)
  // Update state
} catch (error) {
  console.error('Failed to fetch live data:', error)
  // UI continues with last known state
}
```

## Future Enhancements

Potential improvements for even better real-time experience:

1. **WebSocket Integration:** Replace polling with WebSocket for true push-based updates
2. **Optimistic UI Updates:** Show bid immediately before server confirmation
3. **Bid Notifications:** Browser notifications when outbid
4. **Adaptive Polling:** Increase frequency (1-2 seconds) during final minutes
5. **Connection Status:** Show indicator if polling fails

## Comparison: Polling vs WebSockets

| Feature | Short-Polling (Current) | WebSockets |
|---------|------------------------|------------|
| Implementation | ✅ Simple | ⚠️ Complex |
| Server Load | ✅ Moderate | ✅ Low |
| Real-time | ⚠️ 3-second delay | ✅ Instant |
| Reliability | ✅ High | ⚠️ Connection issues |
| Scalability | ✅ Good | ✅ Excellent |

**Decision:** Short-polling is sufficient for tiebreaker use case. WebSockets would be overkill unless scaling to 100+ simultaneous tiebreakers.

## Testing Checklist

- [ ] Multiple teams can bid simultaneously
- [ ] Bids appear on all screens within 3 seconds
- [ ] Timer counts down accurately
- [ ] Polling stops when tiebreaker resolves
- [ ] Withdrawn teams stop seeing updates
- [ ] Admin sees all bids from all teams
- [ ] Page works with slow network connections
- [ ] No memory leaks when navigating away
- [ ] Bid amount auto-updates when outbid

## Troubleshooting

**Problem:** Updates not appearing
- Check browser console for fetch errors
- Verify API endpoint is accessible
- Confirm tiebreaker status is 'pending'

**Problem:** Page feels slow
- Check network tab for request timing
- Verify polling interval is 3000ms
- Look for unnecessary re-renders

**Problem:** Timer not counting down
- Verify `maxEndTime` is set correctly
- Check timezone handling
- Confirm timer useEffect is running

## Summary

The live update system provides a smooth, real-time bidding experience using simple HTTP polling. It's reliable, efficient, and easy to maintain while delivering the responsiveness users expect from modern web applications.
