# Apply Tournament Teams Changes

## Summary
We've created a `tournament_teams` table to establish a direct relationship between tournaments and teams. This allows teams to be registered before matches are created.

## ✅ What's Already Done

### 1. Schema Updated
- ✅ `prisma/schema.prisma` - Added `tournament_teams` model
- ✅ Prisma Client regenerated with `npx prisma generate`

### 2. Migration Files Created
- ✅ `prisma/migrations/add_tournament_teams.sql` - SQL migration script
- ✅ `scripts/migrate-tournament-teams.ts` - TypeScript migration script
- ✅ `app/api/admin/migrate-tournament-teams/route.ts` - API endpoint for migration

### 3. Pages Updated
- ✅ `app/(public)/tournaments/[tournamentId]/teams/page.tsx` - Now uses `tournament_teams` table
- ✅ `components/tournaments/TournamentView.tsx` - Added "View Teams" button

### 4. Documentation Created
- ✅ `TOURNAMENT-TEAMS-SYSTEM.md` - Complete system documentation
- ✅ `RUN-TOURNAMENT-TEAMS-MIGRATION.md` - Migration guide

## 🔧 What You Need to Do

### Step 1: Run the Migration via API

Since we're having environment issues with scripts, use the API endpoint instead:

1. **Start your development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:3000/super-admin
   ```

3. **Open browser console** (F12) and run this command:
   ```javascript
   fetch('/api/admin/migrate-tournament-teams', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     }
   })
   .then(res => res.json())
   .then(data => console.log('Migration result:', data))
   .catch(err => console.error('Migration error:', err))
   ```

4. **Check the result** in the console. You should see:
   ```json
   {
     "success": true,
     "message": "Migration completed successfully",
     "recordsCreated": 10  // or however many tournament-team relationships exist
   }
   ```

### Step 2: Verify the Migration

Visit any tournament page to verify:
```
http://localhost:3000/tournaments/[tournamentId]/teams
```

You should see:
- All teams participating in that tournament
- Tournament-specific stats (matches played, wins, losses, goals)
- Teams sorted by points

### Step 3: Update Tournament Creation (TODO)

The tournament creation flow needs to be updated to add teams to `tournament_teams` when creating a tournament. Here's what needs to be done:

#### Option A: Update Existing Tournament Form

Find where tournaments are created (likely in `components/tournament/TournamentFormAdvanced.tsx`) and add code to create `tournament_teams` records:

```typescript
// After creating the tournament
const tournament = await prisma.tournaments.create({
  data: tournamentData
})

// Add teams to tournament
await prisma.tournament_teams.createMany({
  data: selectedTeamIds.map((teamId, index) => ({
    id: `tt-${tournament.id}-${teamId}`,
    tournamentId: tournament.id,
    teamId: teamId,
    seedPosition: index + 1  // Optional: for seeding
  }))
})
```

#### Option B: Create API Endpoint

Create `app/api/tournaments/[tournamentId]/teams/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// POST /api/tournaments/[tournamentId]/teams
export async function POST(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const { teamIds, groupAssignments } = await request.json()

  try {
    await prisma.tournament_teams.createMany({
      data: teamIds.map((teamId: string, index: number) => ({
        id: `tt-${tournamentId}-${teamId}`,
        tournamentId,
        teamId,
        groupName: groupAssignments?.[teamId] || null,
        seedPosition: index + 1
      })),
      skipDuplicates: true
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add teams' },
      { status: 500 }
    )
  }
}

// GET /api/tournaments/[tournamentId]/teams
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params

  const teams = await prisma.tournament_teams.findMany({
    where: { tournamentId },
    include: {
      seasonTeam: {
        include: {
          team: true
        }
      }
    },
    orderBy: { seedPosition: 'asc' }
  })

  return NextResponse.json({ teams })
}
```

## 📋 Current Behavior vs New Behavior

### Before (Current - After Migration)
- ✅ Teams extracted from existing matches
- ✅ Tournament teams page works
- ❌ Can't add teams before creating matches
- ❌ New tournaments won't have teams until matches are created

### After (Once APIs are Updated)
- ✅ Teams can be added when creating tournament
- ✅ Teams visible immediately
- ✅ Can assign groups and seeding
- ✅ Fixture generation uses registered teams

## 🎯 Next Steps Priority

1. **HIGH PRIORITY**: Run the migration via API (Step 1 above)
2. **MEDIUM PRIORITY**: Update tournament creation to add teams
3. **LOW PRIORITY**: Add UI for managing tournament teams (add/remove teams)

## 🐛 Troubleshooting

### Migration API returns error
- Check that you're logged in as SUPER_ADMIN
- Check browser console for detailed error
- Check server logs for database errors

### Teams not showing on tournament page
- Verify migration ran successfully
- Check database: `SELECT * FROM tournament_teams LIMIT 10;`
- Restart development server

### Duplicate key errors
- The migration handles duplicates with `ON CONFLICT DO NOTHING`
- If you see this error, it means some data already exists (which is fine)

## 📞 Need Help?

If you encounter issues:
1. Check the server logs for detailed errors
2. Verify the DATABASE_URL in `.env` is correct
3. Try restarting the development server
4. Check that Prisma Client is up to date: `npx prisma generate`
