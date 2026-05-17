# Header Padding Fix Required

## Issue
The PublicHeader component is `fixed` with `h-20`, but many pages are missing `pt-20` padding, causing content to hide under the header.

## Solution
Add `pt-20` to the main container div of each page.

## Pages That Need Fixing

### ✅ Already Fixed (have pt-20 or pt-24)
- `app/(team)/team/page.tsx` - has `pt-20`
- `app/(team)/team/profile/page.tsx` - has `pt-20`
- `app/(team)/team/finances/page.tsx` - has `pt-20`
- `app/(team)/team/squad/page.tsx` - has `pt-20`
- `app/(team)/team/matches/page.tsx` - has `pt-20`
- `app/(team)/team/not-in-season/page.tsx` - has `pt-20`
- `app/(team)/team/players/page.tsx` - has `pt-24`
- `app/(team)/team/calendar/page.tsx` - has `pt-24`
- `app/(team)/team/auctions/page.tsx` - has `pt-24`
- `app/auth/layout.tsx` - has `pt-20` on main

### ❌ Need Fixing (missing padding)
1. `app/page.tsx` - Home page
2. `app/(team)/team/tournaments/[tournamentId]/page.tsx` - has `py-8` only
3. `app/(team)/team/players/[playerId]/page.tsx` - has `pt-0`
4. `app/(team)/team/squad/builder/page.tsx` - has `py-8` only
5. `app/(team)/team/matches/[matchId]/page.tsx` - missing padding
6. `app/(team)/team/auction/page.tsx` - missing padding
7. `app/(team)/team/auction-planner/page.tsx` - needs checking
8. `app/(team)/team/auction/bulk-rounds/[id]/page.tsx` - needs checking
9. `app/(team)/team/auction/tiebreakers/[id]/page.tsx` - needs checking
10. `app/(team)/team/auction/rounds/[id]/page.tsx` - needs checking
11. `app/(team)/team/squad/[playerId]/page.tsx` - needs checking
12. `app/(team)/team/tournaments/page.tsx` - needs checking

### Admin Pages (need checking)
- All `app/(admin)/**` pages need to be checked

## Recommended Fix Pattern

### For pages with min-h-screen div:
```tsx
// Before
<div className="min-h-screen bg-[#0a0a0a] text-white">

// After  
<div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
```

### For pages with main element:
```tsx
// Before
<main className="pb-16 px-6 lg:px-8">

// After
<main className="pt-20 pb-16 px-6 lg:px-8">
```

### For pages with py-8:
```tsx
// Before
<div className="min-h-screen bg-[#0a0a0a] py-8">

// After
<div className="min-h-screen bg-[#0a0a0a] pt-20 pb-8">
```

## Implementation Priority
1. High traffic pages (home, team dashboard, auction pages)
2. Team pages
3. Admin pages
4. Public pages
