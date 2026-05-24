# Release Request Limit - Quick Summary

## The Rules

### 🔴 Limit 1: Maximum 3 Total Requests
- Teams can submit **at most 3 release requests** per season
- Counts ALL requests regardless of status (pending, approved, rejected)
- Once 3 requests are submitted, no more can be added
- Canceling a pending request frees up a slot

### 🟢 Limit 2: Maximum 3 Approved Releases
- Teams can have **at most 3 approved releases** per season
- Only approved requests count toward this limit
- Rejected requests don't count
- This is the actual "player release" limit

## Why Two Limits?

**Without the total request limit:**
- Teams could spam 100 requests
- Admin has to review all of them
- Even if all rejected, team keeps submitting

**With the total request limit:**
- Teams can only submit 3 requests total
- Prevents spam and admin overload
- Teams must be strategic about which players to request
- If all 3 are rejected, team is stuck (encourages careful selection)

## Examples

### Example 1: Normal Flow ✅
1. Team submits 2 requests → **Total: 2/3, Approved: 0/3**
2. Admin approves both → **Total: 2/3, Approved: 2/3**
3. Team submits 1 more → **Total: 3/3, Approved: 2/3**
4. Admin approves it → **Total: 3/3, Approved: 3/3**
5. Team tries to submit another → **❌ BLOCKED** (total limit reached)

### Example 2: All Rejected ❌
1. Team submits 3 requests → **Total: 3/3, Approved: 0/3**
2. Admin rejects all 3 → **Total: 3/3, Approved: 0/3**
3. Team tries to submit another → **❌ BLOCKED** (total limit reached)
4. Team is stuck with 0 approved releases

### Example 3: With Cancellation ✅
1. Team submits 3 requests → **Total: 3/3, Approved: 0/3**
2. Team cancels 1 pending → **Total: 2/3, Approved: 0/3**
3. Team can submit 1 more → **Total: 3/3, Approved: 0/3**

## What Teams See

### Banner (Top of Page)
```
┌─────────────────────────────────────────────┐
│ 🔵 Release Request Limits                   │
│ 1 of 3 request slots remaining              │
│                                              │
│ Total Requests: 2/3    Approved: 1/3        │
└─────────────────────────────────────────────┘
```

### All Requests Section
Shows all requests with status:
- 🔵 **PENDING** - Can be canceled
- 🟢 **APPROVED** - Counted toward approved limit
- 🔴 **REJECTED** - Shows rejection reason

### When Limit Reached
```
┌─────────────────────────────────────────────┐
│ ⚠️  Request Limit Reached                   │
│                                              │
│ You have already submitted 3 release        │
│ requests this season. No more requests      │
│ can be submitted.                           │
│                                              │
│ You have 1 approved release.                │
└─────────────────────────────────────────────┘
```

## Technical Implementation

### API Validation (Both Limits)
```typescript
// Check 1: Total requests
const totalRequestsCount = await prisma.release_requests.count({
  where: { seasonId, teamId }
})
if (totalRequestsCount + releases.length > 3) {
  return error
}

// Check 2: Approved releases
const approvedReleasesCount = await prisma.release_requests.count({
  where: { seasonId, teamId, status: 'approved' }
})
if (approvedReleasesCount + releases.length > 3) {
  return error
}
```

### Client Validation
- Prevents selecting more than `remainingRequests`
- Shows warning when limit would be exceeded
- Disables submit button when invalid

## Files Changed

1. `app/api/team/release-requests/route.ts` - Dual validation
2. `app/(team)/team/release-request/page.tsx` - Fetch all requests
3. `components/team/ReleaseRequestClient.tsx` - Dual-limit UI

## Configuration

Both limits use the same value (3):
```typescript
const MAX_RELEASES_PER_TEAM = 3
```

Change in:
- `app/api/team/release-requests/route.ts`
- `app/(team)/team/release-request/page.tsx`
