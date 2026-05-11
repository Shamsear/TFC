# Regenerate Prisma Client Required

## Issue

You're seeing TypeScript errors about `finalizationState` not existing, even though it's in your schema:

```
Object literal may only specify known properties, and 'finalizationState' does not exist
```

## Cause

The Prisma client TypeScript types are out of sync with your schema. This happens when:
1. The schema is updated
2. But `prisma generate` hasn't been run to regenerate the client types

## Solution

Run this command to regenerate the Prisma client:

```bash
npx prisma generate
```

This will:
- Read your `prisma/schema.prisma` file
- Generate TypeScript types that match your schema
- Update the Prisma client with the correct types

## After Regenerating

1. ✅ TypeScript errors will disappear
2. ✅ `finalizationState` field will be recognized
3. ✅ Preview mode will work correctly
4. ✅ Tiebreaker amounts will be saved

## Why This Matters

The `finalizationState` field is used to:
- Track preview mode status (`previewMode: true`)
- Store allocated teams and players during sequential finalization
- Preserve state when tiebreakers are created
- Ensure tiebreaker winners are saved to preview_allocations (not applied immediately)

Without regenerating, TypeScript doesn't know this field exists, causing compilation errors.

## Quick Fix

```bash
# Stop your dev server (Ctrl+C)
npx prisma generate
# Restart your dev server
npm run dev
```

That's it! 🚀
