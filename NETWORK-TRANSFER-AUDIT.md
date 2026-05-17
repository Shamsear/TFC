# Network Transfer Audit - Data Usage Analysis

## Executive Summary

**Critical Issues Found:**
- 🔴 **HIGH**: Multiple pages loading ALL players with nested relations
- 🔴 **HIGH**: No pagination limits on several queries
- 🟡 **MEDIUM**: Excessive nested includes causing N+1 queries
- 🟡 **MEDIUM**: Duplicate data fetching in multiple components
- 🟢 **LOW**: Some queries already optimized with limits

**Estimated Data Transfer per Page Load:**
- Home Page: ~500KB (includes all transfers with nested data)
- Squad Page: ~200-500KB (depends on squad size)
- All Players Page: ~2-5MB per search (no server-side limits)
- Admin Round Detail: ~1-3MB (all bids + tiebreakers)
- Player Search API: ~500KB-1MB per request

---

## Critical Issues by Page/Route

### 1. HOME PAGE (`app/page.tsx`)
**Issue:** Loading excessive nested data for public page

```typescript
// PROBLEM: Includes ALL seasonTeams with nested teams
const activeSeason = await prisma.seasons.findFirst({
  where: { isActive: true },
  include: {
    seasonTeams: {
      include: {
        team: true  // ❌ Loads all team data
      }
    }
  }
})

// PROBLEM: Last 10 transfers with full nested data
const recentTransfers = await prisma.transfer_history.findMany({
  take: 10,
  orderBy: { createdAt: 'desc' },
  include: {
    basePlayer: true,  // ❌ Full player object
    team: true,        // ❌ Full team object
    season: true       // ❌ Full season object
  }
})
```

**Impact:** ~500KB per page load
**Fix Priority:** HIGH
**Recommendation:**
```typescript
// Use select instead of include
const activeSeason = await prisma.seasons.findFirst({
  where: { isActive: true },
  select: {
    id: true,
    name: true,
    _count: { select: { seasonTeams: true } }
  }
})

const recentTransfers = await prisma.transfer_history.findMany({
  take: 5,  // Reduce from 10 to 5
  orderBy: { createdAt: 'desc' },
  select: {
    id: true,
    soldPrice: true,
    basePlayer: { select: { id: true, name: true } },
    team: { select: { id: true, name: true } },
    season: { select: { name: true } }
  }
})
```

---

### 2. SQUAD PAGE (`app/(team)/team/squad/page.tsx`)
**Issue:** Loading full seasonal stats for every player

```typescript
// PROBLEM: Nested seasonalPlayerStats query
const transfers = await prisma.transfer_history.findMany({
  where: { seasonId, teamId },
  include: {
    basePlayer: {
      select: {
        id: true,
        name: true,
        player_id: true,
        seasonalPlayerStats: {  // ❌ Nested query
          where: { seasonId },
          select: {
            position: true,
            position_group: true,
            overallRating: true,
            realWorldClub: true,
          },
        },
      },
    },
  },
})
```

**Impact:** ~200-500KB depending on squad size
**Fix Priority:** MEDIUM
**Recommendation:**
```typescript
// Fetch stats separately and join in memory
const [transfers, stats] = await Promise.all([
  prisma.transfer_history.findMany({
    where: { seasonId, teamId },
    select: {
      id: true,
      soldPrice: true,
      basePlayerId: true,
      basePlayer: {
        select: { id: true, name: true, player_id: true }
      }
    }
  }),
  prisma.seasonal_player_stats.findMany({
    where: {
      seasonId,
      basePlayerId: { in: playerIds }
    },
    select: {
      basePlayerId: true,
      position: true,
      position_group: true,
      overallRating: true,
      realWorldClub: true
    }
  })
])
```

---

### 3. PLAYER SEARCH API (`app/api/players/search/route.ts`)
**Issue:** Complex nested includes on every search

```typescript
// PROBLEM: Triple nested include
include: {
  basePlayer: {
    include: {
      transferHistory: {
        where: { seasonId },
        include: {  // ❌ Triple nesting
          team: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    }
  }
}
```

**Impact:** ~500KB-1MB per search request
**Fix Priority:** HIGH
**Recommendation:**
- Already has pagination (24 items) ✅
- Reduce nested includes
- Consider caching team data
- Add response compression

---

### 4. ADMIN ROUND DETAIL (`app/(admin)/sub-admin/[seasonId]/auction/rounds/[roundId]/page.tsx`)
**Issue:** Loading ALL bids and tiebreakers with nested data

```typescript
// PROBLEM: No limits on tiebreakers
const round = await prisma.rounds.findUnique({
  where: { id: roundId },
  include: {
    teamRoundBids: true,  // ❌ ALL bids
    tiebreakers: {
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {  // ❌ Nested stats
              where: { seasonId },
              take: 1
            }
          }
        },
        teamTiebreakerBids: true  // ❌ ALL tiebreaker bids
      }
    }
  }
})
```

**Impact:** ~1-3MB per page load
**Fix Priority:** HIGH
**Recommendation:**
```typescript
// Fetch round metadata first, then load details on demand
const round = await prisma.rounds.findUnique({
  where: { id: roundId },
  select: {
    id: true,
    roundNumber: true,
    status: true,
    // ... other fields
    _count: {
      select: {
        teamRoundBids: true,
        tiebreakers: true
      }
    }
  }
})

// Load bids/tiebreakers only if needed
if (round.status === 'completed') {
  // Fetch results separately
}
```

---

### 5. TEAM AUCTION PAGE (`app/(team)/team/auction/page.tsx`)
**Issue:** Loading too many rounds with nested data

```typescript
// PROBLEM: Loading 20 rounds with all related data
const rounds = await prisma.rounds.findMany({
  where: { seasonId },
  select: { /* ... */ },
  take: 20  // ⚠️ Too many
})

// PROBLEM: Separate queries for bids and selections
const teamBids = await prisma.team_round_bids.findMany({
  where: { teamId, roundId: { in: rounds.map(r => r.id) } }
})
```

**Impact:** ~300-800KB per page load
**Fix Priority:** MEDIUM
**Recommendation:**
```typescript
// Reduce to 10 rounds
const rounds = await prisma.rounds.findMany({
  where: { seasonId },
  select: { /* ... */ },
  take: 10  // Reduced from 20
})

// Combine queries with Promise.all
const [rounds, teamBids, bulkSelections] = await Promise.all([
  // ... queries
])
```

---

## API Routes with Excessive Data Transfer

### 1. `/api/players/search` ✅ ALREADY OPTIMIZED
- Has pagination (24 items)
- Needs: Response compression, reduce nested includes

### 2. `/api/seasons/[seasonId]/players/route.ts`
**Issue:** No pagination, loads ALL players
```typescript
const seasonalStats = await prisma.seasonal_player_stats.findMany({
  where: { seasonId, /* ... */ },
  include: { basePlayer: true }  // ❌ No limit
})
```
**Fix:** Add pagination with `take` and `skip`

### 3. `/api/seasons/[seasonId]/auction/sold/route.ts`
**Issue:** Loads ALL sold players
```typescript
const soldPlayers = await prisma.transfer_history.findMany({
  where: { seasonId },
  include: {
    basePlayer: {
      include: {
        seasonalPlayerStats: { /* ... */ }  // ❌ Nested
      }
    }
  }
})
```
**Fix:** Add pagination and reduce nesting

---

## Optimization Recommendations

### Immediate Actions (HIGH Priority)

1. **Add Response Compression**
```typescript
// next.config.js
module.exports = {
  compress: true,  // Enable gzip compression
}
```

2. **Limit Home Page Data**
```typescript
// Reduce transfers from 10 to 5
// Use select instead of include
// Remove unnecessary nested data
```

3. **Add Pagination to All findMany Queries**
```typescript
// Add to all queries without limits
take: 50,  // or appropriate limit
skip: (page - 1) * 50
```

4. **Optimize Player Search API**
```typescript
// Reduce nested includes
// Cache team data
// Use select instead of include where possible
```

### Medium Priority

5. **Implement Data Caching**
```typescript
// Cache frequently accessed data
import { unstable_cache } from 'next/cache'

const getSeasonTeams = unstable_cache(
  async (seasonId) => {
    return await prisma.season_teams.findMany({
      where: { seasonId },
      select: { /* minimal fields */ }
    })
  },
  ['season-teams'],
  { revalidate: 300 } // 5 minutes
)
```

6. **Separate Stats Queries**
```typescript
// Instead of nested includes, fetch separately
const [players, stats] = await Promise.all([
  prisma.base_players.findMany({ /* ... */ }),
  prisma.seasonal_player_stats.findMany({ /* ... */ })
])
// Join in memory
```

7. **Add Database Indexes**
```sql
CREATE INDEX idx_transfer_history_season_team ON transfer_history(season_id, team_id);
CREATE INDEX idx_seasonal_stats_season_rating ON seasonal_player_stats(season_id, overall_rating DESC);
CREATE INDEX idx_rounds_season_status ON rounds(season_id, status);
```

### Low Priority

8. **Implement Virtual Scrolling**
- For long player lists
- Load data as user scrolls
- Reduces initial page load

9. **Image Optimization**
- Use Next.js Image component everywhere
- Implement lazy loading
- Use WebP format

10. **API Response Optimization**
```typescript
// Add response headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  }
})
```

---

## Estimated Savings

### Before Optimizations:
- Home Page: ~500KB
- Squad Page: ~400KB
- Player Search: ~800KB
- Admin Pages: ~2MB
- **Total per session: ~10-15MB**

### After Optimizations:
- Home Page: ~100KB (80% reduction)
- Squad Page: ~150KB (62% reduction)
- Player Search: ~300KB (62% reduction)
- Admin Pages: ~500KB (75% reduction)
- **Total per session: ~2-3MB (80% reduction)**

---

## Implementation Priority

### Week 1 (Critical)
1. ✅ Add limits to team auction rounds page (DONE)
2. ✅ Add limits to admin create round page (DONE)
3. 🔲 Optimize home page queries
4. 🔲 Add response compression
5. 🔲 Add pagination to sold players API

### Week 2 (High)
6. 🔲 Optimize squad page queries
7. 🔲 Reduce player search API nesting
8. 🔲 Add database indexes
9. 🔲 Implement caching for static data

### Week 3 (Medium)
10. 🔲 Optimize admin round detail page
11. 🔲 Add virtual scrolling to player lists
12. 🔲 Implement image optimization

---

## Monitoring

Track these metrics after optimization:
- Average page load size (target: <200KB)
- API response times (target: <500ms)
- Database query count per page (target: <10)
- Monthly bandwidth usage
- Core Web Vitals (LCP, FID, CLS)

---

## Quick Wins Checklist

- [ ] Enable Next.js compression
- [ ] Add `take: 50` to all findMany without limits
- [ ] Replace `include` with `select` where possible
- [ ] Reduce home page transfers from 10 to 5
- [ ] Add database indexes
- [ ] Cache season/team data (5 min TTL)
- [ ] Remove unused fields from queries
- [ ] Implement parallel queries with Promise.all
