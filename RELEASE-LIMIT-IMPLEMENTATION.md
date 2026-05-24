# Release Limit Implementation - Dual Tracking System

## Overview
Implemented a **dual-limit system** for player releases:
1. **Maximum 3 release requests** (total, regardless of status)
2. **Maximum 3 approved releases** (only approved requests count)

This ensures teams can only submit 3 requests total AND can only have 3 approved releases.

## Dual Limit Logic

### Limit 1: Total Requests (3 max)
- Counts ALL release requests regardless of status (pending, approved, rejected)
- Prevents teams from spamming requests
- Once 3 requests are submitted, no more can be added
- Canceling a pending request frees up a slot

### Limit 2: Approved Releases (3 max)
- Counts ONLY approved releases
- Prevents teams from releasing more than 3 players
- Admin approval is required to count toward this limit
- Rejected requests don't count

## How It Works

### Scenario Examples

**Example 1: Normal Flow**
- Team submits 2 release requests → Total: 2/3, Approved: 0/3 ✅
- Admin approves both → Total: 2/3, Approved: 2/3 ✅
- Team submits 1 more request → Total: 3/3, Approved: 2/3 ✅
- Admin approves it → Total: 3/3, Approved: 3/3 ✅
- Team tries to submit another → ❌ BLOCKED (total limit reached)

**Example 2: With Rejections**
- Team submits 3 release requests → Total: 3/3, Approved: 0/3 ✅
- Admin rejects all 3 → Total: 3/3, Approved: 0/3 ✅
- Team tries to submit another → ❌ BLOCKED (total limit reached)
- Team cannot submit more even though 0 approved

**Example 3: With Cancellations**
- Team submits 3 release requests → Total: 3/3, Approved: 0/3 ✅
- Team cancels 1 pending request → Total: 2/3, Approved: 0/3 ✅
- Team can now submit 1 more → Total: 3/3, Approved: 0/3 ✅

**Example 4: Mixed Status**
- Team submits 2 requests → Total: 2/3, Approved: 0/3 ✅
- Admin approves 1, rejects 1 → Total: 2/3, Approved: 1/3 ✅
- Team submits 1 more → Total: 3/3, Approved: 1/3 ✅
- Admin approves it → Total: 3/3, Approved: 2/3 ✅
- Team cannot submit more (total limit), but could if they cancel rejected ones

## Changes Made

### 1. API Route Updates (`app/api/team/release-requests/route.ts`)

#### POST Endpoint - Dual Validation
```typescript
const MAX_RELEASES_PER_TEAM = 3

// Check 1: Total requests (all statuses)
const totalRequestsCount = await prisma.release_requests.count({
  where: { seasonId, teamId }
})

if (totalRequestsCount + releases.length > MAX_RELEASES_PER_TEAM) {
  // Return error - request limit reached
}

// Check 2: Approved releases
const approvedReleasesCount = await prisma.release_requests.count({
  where: { seasonId, teamId, status: 'approved' }
})

if (approvedReleasesCount + releases.length > MAX_RELEASES_PER_TEAM) {
  // Return error - approval limit reached
}
```

#### GET Endpoint - Returns Both Counts
```typescript
return NextResponse.json({ 
  requests,
  totalRequestsCount,      // All requests
  approvedCount,           // Only approved
  maxReleases: 3,
  remainingRequests,       // 3 - total
  remainingApprovals,      // 3 - approved
})
```

### 2. Page Component Updates (`app/(team)/team/release-request/page.tsx`)

- Fetches ALL requests (not just pending)
- Calculates both limits:
  - `totalRequestsCount`: All requests
  - `approvedReleasesCount`: Only approved
  - `remainingRequests`: 3 - total
  - `remainingApprovals`: 3 - approved
- Passes all data to client component

### 3. Client Component Updates (`components/team/ReleaseRequestClient.tsx`)

#### New Props
- `allRequests`: All requests with status
- `totalRequestsCount`: Total requests count
- `remainingRequests`: Remaining request slots
- `remainingApprovals`: Remaining approval slots

#### Visual Indicators

**Dual-Limit Banner**
- Shows both limits side by side:
  - "Total Requests: X/3"
  - "Approved: Y/3"
- Color-coded based on remaining request slots
- Clear messaging about which limit applies

**All Requests Section**
- Shows ALL requests (pending, approved, rejected)
- Color-coded by status:
  - Blue: Pending
  - Green: Approved
  - Red: Rejected
- Shows rejection reason for rejected requests
- Can only cancel pending requests

#### Functional Changes

**Player Selection**
- Validates against `remainingRequests` (not approved count)
- Alert shows: "X/3 requests used"

**Submit Validation**
- Checks `remainingRequests` before submission
- Error message explains both limits

**Cancel Request**
- Updates `totalRequestsCount` and `remainingRequests`
- Frees up a request slot

## User Experience

### Initial State (0 requests)
- Banner: Blue, "3 of 3 request slots remaining"
- Total Requests: 0/3
- Approved: 0/3
- Can select up to 3 players

### After Submitting 2 Requests (pending)
- Banner: Blue, "1 of 3 request slots remaining"
- Total Requests: 2/3
- Approved: 0/3
- Can select 1 more player
- Shows 2 pending requests (can cancel)

### After Admin Approves 1, Rejects 1
- Banner: Blue, "1 of 3 request slots remaining"
- Total Requests: 2/3
- Approved: 1/3
- Can select 1 more player
- Shows 1 approved, 1 rejected request

### After Submitting 1 More (total 3)
- Banner: Red, "0 of 3 request slots remaining"
- Total Requests: 3/3
- Approved: 1/3
- Cannot select any players
- Large warning: "Request Limit Reached"

### After Canceling 1 Rejected Request
- Banner: Blue, "1 of 3 request slots remaining"
- Total Requests: 2/3
- Approved: 1/3
- Can select 1 more player

## Validation Layers

### Layer 1: Client-Side Selection
- Prevents selecting more than `remainingRequests`
- Immediate feedback via alert

### Layer 2: Client-Side Submit
- Validates `remainingRequests` before API call
- Shows alert if invalid

### Layer 3: API Validation (Dual Check)
- **Check 1**: Total requests limit
- **Check 2**: Approved releases limit
- Returns specific error for each limit

## Database Queries

### Counting Total Requests
```typescript
const totalRequestsCount = await prisma.release_requests.count({
  where: {
    seasonId: 'season-id',
    teamId: 'team-id',
    // No status filter - counts ALL
  },
})
```

### Counting Approved Releases
```typescript
const approvedReleasesCount = await prisma.release_requests.count({
  where: {
    seasonId: 'season-id',
    teamId: 'team-id',
    status: 'approved',
  },
})
```

## Edge Cases Handled

1. **All Requests Rejected**: Still counts toward total limit
2. **Canceling Pending**: Frees up request slot
3. **Cannot Cancel Approved/Rejected**: Only pending can be canceled
4. **Concurrent Submissions**: API validates on each request
5. **Admin Approval**: Doesn't affect total count (already counted)
6. **Admin Rejection**: Doesn't free up request slot

## Why Dual Limits?

### Problem Without Dual Limits
- Team could spam 100 requests
- Admin has to review all 100
- Even if all rejected, team could keep submitting

### Solution With Dual Limits
- Team can only submit 3 requests total
- Prevents spam and admin overload
- Team must be strategic about which players to request
- If rejected, team is stuck (encourages careful selection)

## Testing Checklist

### Total Request Limit
- [ ] Cannot submit more than 3 requests total
- [ ] Pending requests count toward limit
- [ ] Approved requests count toward limit
- [ ] Rejected requests count toward limit
- [ ] Canceling pending frees up slot
- [ ] Banner shows correct total count

### Approved Release Limit
- [ ] Cannot have more than 3 approved
- [ ] Only approved count toward this limit
- [ ] Pending don't count
- [ ] Rejected don't count
- [ ] Banner shows correct approved count

### UI Display
- [ ] All requests shown with status
- [ ] Color-coded by status
- [ ] Can only cancel pending
- [ ] Rejection reason displayed
- [ ] Both limits shown in banner

### Integration
- [ ] Multiple teams have independent limits
- [ ] Limits reset per season
- [ ] Works with window control

## Configuration

Both limits use the same constant:
```typescript
const MAX_RELEASES_PER_TEAM = 3
```

To change:
1. Update in `app/api/team/release-requests/route.ts`
2. Update in `app/(team)/team/release-request/page.tsx`

## Files Modified

1. `app/api/team/release-requests/route.ts` - Dual validation
2. `app/(team)/team/release-request/page.tsx` - Fetch all requests
3. `components/team/ReleaseRequestClient.tsx` - Dual-limit UI

## Future Enhancements

1. **Separate Limits**: Different values for requests vs approvals
2. **Admin Override**: Bypass limits in special cases
3. **Request Reset**: Admin can reset team's request count
4. **Bulk Cancel**: Cancel all rejected requests at once
5. **Request History Export**: Download all requests as CSV
