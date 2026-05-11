# Quick Fix Summary

## The Error

```
new row for relation "rounds" violates check constraint "rounds_status_check"
```

## The Cause

Two issues:
1. Database doesn't allow `preview_finalized` as a valid status
2. Preview mode doesn't set a flag when creating tiebreakers, so results get applied immediately instead of saved for preview

## The Fix

Run these two commands:

```bash
# 1. Add preview_finalized status to database
npx tsx scripts/add-preview-finalized-status.ts

# 2. Regenerate Prisma client to recognize finalizationState field
npx prisma generate

# 3. Restart your dev server
npm run dev
```

## What It Does

1. Adds `preview_finalized` to allowed round statuses
2. Updates TypeScript types for Prisma client
3. Enables preview mode to work correctly with tiebreakers

## After Running

✅ Manual finalization mode will work
✅ Preview allocations will save correctly
✅ Tiebreaker resolution will complete
✅ Tiebreaker amounts saved in preview mode
✅ Results stay hidden until admin makes them public
✅ No more constraint violation errors

## Files Created

1. `scripts/add-preview-finalized-status.ts` - Migration script
2. `scripts/add-preview-finalized-status.sql` - SQL version
3. `FIX-PREVIEW-FINALIZED-STATUS.md` - Database migration instructions
4. `REGENERATE-PRISMA-CLIENT.md` - Prisma regeneration instructions
5. `PREVIEW-MODE-TIEBREAKER-FIX.md` - Detailed explanation of the fix

## That's It!

Just run the two commands and you're good to go. 🚀
