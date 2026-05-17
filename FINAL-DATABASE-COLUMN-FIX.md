# Final Database Column Name Fix

## Issue
Auto-finalization was failing with error:
```
column "season_id" does not exist in auction_settings
```

## Root Cause
The `auction_settings` table uses **camelCase** column naming (`seasonId`), but the raw SQL query in `lib/auction/reserve-calculator-v2.ts` was using **snake_case** (`season_id`).

## Database Naming Convention
The database uses **mixed naming conventions**:
- **Prisma-managed tables**: Use camelCase (e.g., `seasonId`, `teamId`, `basePlayerId`)
- **Custom/Neon tables**: Use snake_case (e.g., `season_id`, `round_id`, `team_id`)

The `auction_settings` table is Prisma-managed, so it uses camelCase.

## Fix Applied
**File**: `lib/auction/reserve-calculator-v2.ts` (line ~240)

**Before**:
```sql
WHERE season_id = ${seasonId}
```

**After**:
```sql
WHERE "seasonId" = ${seasonId}
```

Note: The column name is quoted to preserve case sensitivity in PostgreSQL.

## Verification
- ✅ Build completed successfully (0 TypeScript errors)
- ✅ All previous fixes remain intact
- ✅ Ready for deployment and testing

## Related Fixes in This Session
1. **React Hydration Error #418**: Fixed time display mismatch in `RoundDetailClient.tsx`
2. **POSTGRES_URL Error**: Replaced `@vercel/postgres` with Prisma in `app/api/seasons/route.ts`
3. **football_budget Error**: Replaced `@vercel/postgres` with Prisma in `reserve-calculator-v2.ts`
4. **season_id Error**: Fixed column name in raw SQL query (this fix)

## Next Steps
1. Deploy to Vercel
2. Test auto-finalization functionality
3. Monitor for any remaining database-related errors
4. Apply performance indexes from `scripts/add-performance-indexes.sql` if not already done

## Files Modified
- `lib/auction/reserve-calculator-v2.ts` - Fixed SQL query column name
