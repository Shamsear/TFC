# Preview Allocations Table Implementation

## Overview

Created a dedicated `preview_allocations` table to store calculated finalization results before making them public. This provides better data integrity, faster processing, and clearer admin preview functionality.

## Benefits

### 1. **Data Integrity**
- Preview results stored in separate table, not in JSON field
- No risk of corrupting actual transfer_history data
- Clear separation between preview and final allocations

### 2. **Performance**
- No need to re-run finalization when making results public
- Simply copy data from preview_allocations to transfer_history
- Faster "Make Public" operation

### 3. **Better Admin Experience**
- Structured data easier to query and display
- Can show detailed preview results with proper formatting
- Can filter, sort, and analyze preview data

### 4. **Reliability**
- Database constraints ensure data consistency
- One allocation per team per round (UNIQUE constraint)
- One allocation per player per round (UNIQUE constraint)
- Foreign key constraints maintain referential integrity

## Database Schema

```sql
CREATE TABLE preview_allocations (
  id SERIAL PRIMARY KEY,
  round_id VARCHAR(20) NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id VARCHAR(20) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  base_player_id VARCHAR(20) NOT NULL REFERENCES base_players(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  amount INT NOT NULL,
  acquisition_type VARCHAR(50) NOT NULL, -- 'bid_won', 'auto_assigned', 'tiebreaker_won'
  acquisition_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(round_id, team_id),
  UNIQUE(round_id, base_player_id)
);
```

## Workflow

### Preview Mode Flow

1. **Admin starts preview finalization**
   ```
   POST /api/admin/rounds/[id]/finalize { preview: true, force: true }
   ```

2. **System creates tiebreakers** (if needed)
   - Teams resolve tiebreakers normally
   - Tiebreakers marked with `previewMode: true` flag

3. **System calculates allocations**
   - Runs full finalization logic
   - Stores results in `preview_allocations` table
   - Round status: `preview_finalized`

4. **Admin reviews results**
   - Query `preview_allocations` table
   - Display formatted results on admin page
   - Admin can verify before making public

5. **Admin makes results public**
   ```
   POST /api/admin/rounds/[id]/make-public
   ```
   - Copy data from `preview_allocations` to `transfer_history`
   - Update team budgets
   - Create financial ledger entries
   - Delete preview allocations
   - Round status: `completed`

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PREVIEW MODE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Finalization Logic                                      │
│     ↓                                                        │
│  2. Calculate Allocations                                   │
│     ↓                                                        │
│  3. INSERT INTO preview_allocations                         │
│     ↓                                                        │
│  4. Round status = 'preview_finalized'                      │
│     ↓                                                        │
│  5. Admin reviews (SELECT FROM preview_allocations)         │
│     ↓                                                        │
│  6. Admin clicks "Make Public"                              │
│     ↓                                                        │
│  7. Copy to transfer_history                                │
│  8. Update budgets                                          │
│  9. Create ledger entries                                   │
│ 10. DELETE FROM preview_allocations                         │
│ 11. Round status = 'completed'                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Code Changes Required

### 1. Update `resumeFinalizationAfterTiebreaker()` in `lib/auction/tiebreaker.ts`

When preview mode is complete:
```typescript
if (isPreviewMode) {
  // Store allocations in preview_allocations table
  await prisma.preview_allocations.createMany({
    data: result.allocations.map(alloc => ({
      roundId: tiebreaker.roundId,
      teamId: alloc.teamId,
      basePlayerId: alloc.basePlayerId,
      playerName: alloc.playerName,
      amount: alloc.amount,
      acquisitionType: alloc.acquisitionType,
      acquisitionNotes: alloc.acquisitionNotes
    }))
  });

  await prisma.rounds.update({
    where: { id: tiebreaker.roundId },
    data: { status: 'preview_finalized' }
  });
}
```

### 2. Update `/api/admin/rounds/[id]/make-public/route.ts`

```typescript
// Get preview allocations from database
const previewAllocations = await prisma.preview_allocations.findMany({
  where: { roundId },
  include: {
    team: true,
    basePlayer: true
  }
});

// Apply results
await applyFinalizationResults(roundId, previewAllocations);

// Clean up preview data
await prisma.preview_allocations.deleteMany({
  where: { roundId }
});
```

### 3. Update admin round detail page

```typescript
// Fetch preview allocations
const previewAllocations = await prisma.preview_allocations.findMany({
  where: { roundId },
  include: {
    team: { select: { name: true, logoUrl: true } },
    basePlayer: { select: { name: true, photoUrl: true } }
  },
  orderBy: { amount: 'desc' }
});
```

## Migration Steps

1. **Run SQL migration:**
   ```bash
   psql $DATABASE_URL -f prisma/migrations/add_preview_allocations_table.sql
   ```

2. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

3. **Update code** to use the new table instead of JSON storage

4. **Test preview flow:**
   - Start preview finalization
   - Resolve tiebreakers
   - Verify data in preview_allocations table
   - Make results public
   - Verify data copied to transfer_history

## Advantages Over JSON Storage

| Aspect | JSON Storage | Table Storage |
|--------|-------------|---------------|
| **Query Performance** | Parse JSON every time | Direct SQL queries |
| **Data Integrity** | No constraints | Foreign keys, UNIQUE constraints |
| **Indexing** | Not possible | Indexed columns for fast lookups |
| **Joins** | Manual in code | Native SQL JOINs |
| **Validation** | Application level | Database level |
| **Debugging** | Hard to inspect | Easy SQL queries |
| **Scalability** | Limited | Excellent |

## Example Queries

### Get preview results for admin
```sql
SELECT 
  pa.player_name,
  t.name as team_name,
  pa.amount,
  pa.acquisition_type,
  pa.acquisition_notes
FROM preview_allocations pa
JOIN teams t ON pa.team_id = t.id
WHERE pa.round_id = 'TFCR-2'
ORDER BY pa.amount DESC;
```

### Check if preview is complete
```sql
SELECT COUNT(*) as allocation_count
FROM preview_allocations
WHERE round_id = 'TFCR-2';
```

### Verify no duplicates
```sql
-- Should return 0
SELECT team_id, COUNT(*) 
FROM preview_allocations 
WHERE round_id = 'TFCR-2'
GROUP BY team_id 
HAVING COUNT(*) > 1;
```

## Status

✅ **Migration created**: `add_preview_allocations_table.sql`
✅ **Schema updated**: Added `preview_allocations` model
✅ **Relations added**: rounds, teams, base_players
⏳ **Code updates needed**: Update finalization logic to use table
⏳ **Testing needed**: Full preview flow with tiebreakers

## Next Steps

1. Update `resumeFinalizationAfterTiebreaker()` to write to table
2. Update `make-public` endpoint to read from table
3. Update admin UI to display from table
4. Test complete flow
5. Remove old JSON-based preview logic
