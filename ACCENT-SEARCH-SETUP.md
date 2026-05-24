# Accent-Insensitive Player Search - Setup Instructions

## Overview
The accent-insensitive search feature allows users to find players like "Vinícius Júnior" by typing "vinicius junior" (without accents).

## Implementation Status
✅ Database migration completed (normalized_name column added)
✅ Search API updated to use normalized_name
✅ All import/creation operations updated to populate normalized_name
✅ Normalization utility created (lib/search-utils.ts)
⏳ **PENDING**: Prisma client regeneration and data population

## Next Steps

### 1. Stop the Development Server
The Prisma client cannot be regenerated while the dev server is running.

```bash
# Stop any running dev servers (Ctrl+C in the terminal)
```

### 2. Regenerate Prisma Client
This will update the Prisma client to include the new `normalized_name` field.

```bash
npx prisma generate
```

### 3. Populate Existing Players
Run the population script to add normalized names to all 28,094 existing players.

```bash
npx tsx scripts/populate-normalized-names.ts
```

Expected output:
```
Starting to populate normalized names...
Found 28094 players to process
Processed 100/28094 players...
Processed 200/28094 players...
...
✓ Successfully updated 28094 players with normalized names
```

### 4. Test the Search
After completion, test the search functionality:

1. Go to any player search page (e.g., `/players`)
2. Search for "vinicius junior" (without accents)
3. Verify that "Vinícius Júnior" appears in results

## How It Works

### Normalization Function
```typescript
// lib/search-utils.ts
export function normalizeString(str: string): string {
  return str
    .normalize('NFD')                    // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacritical marks
    .toLowerCase()                       // Convert to lowercase
    .trim()
}
```

### Database Schema
```prisma
model base_players {
  id              String  @id
  name            String
  normalized_name String? // New field for accent-free search
  // ... other fields
}
```

### Search Query
The search API now queries both fields:
```typescript
where: {
  OR: [
    { name: { contains: searchTerm, mode: 'insensitive' } },
    { normalized_name: { contains: normalizedTerm, mode: 'insensitive' } }
  ]
}
```

## Files Modified

### Core Implementation
- `lib/search-utils.ts` - Normalization utility
- `prisma/schema.prisma` - Added normalized_name column
- `scripts/add-normalized-name-migration.sql` - Database migration
- `scripts/populate-normalized-names.ts` - Population script

### Search API
- `app/api/players/search/route.ts` - Updated to search normalized_name

### Import/Creation Operations
- `lib/import-service.ts` - Bulk import service
- `app/api/import/bulk/route.ts` - Bulk import API
- `app/api/import/confirm/route.ts` - Import confirmation
- `app/api/import/stream/route.ts` - Streaming import
- `scripts/add-ss-players.ts` - Manual player addition script

## Troubleshooting

### Prisma Generate Fails
If you get "EPERM: operation not permitted" error:
1. Make sure the dev server is stopped
2. Close any terminals running the app
3. Try again

### Population Script Fails
If the script fails with "Unknown argument 'normalized_name'":
- You need to run `npx prisma generate` first
- The Prisma client must be regenerated to recognize the new field

### Search Not Working
1. Verify Prisma client was regenerated: Check `node_modules/.prisma/client/index.d.ts` for `normalized_name`
2. Verify data was populated: Run `SELECT COUNT(*) FROM base_players WHERE normalized_name IS NOT NULL;`
3. Check browser console for API errors
