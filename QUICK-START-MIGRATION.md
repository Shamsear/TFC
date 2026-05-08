# Quick Start: Run Tournament Teams Migration

## 🚀 Fastest Way (3 Steps)

### Step 1: Start Your Dev Server
```bash
npm run dev
```

### Step 2: Log In as Super Admin
Open http://localhost:3000/super-admin and log in

### Step 3: Run Migration
Open `run-migration.html` in your browser and click "Run Migration"

---

## ✅ What This Fixes

1. **Tournament Standings Page Error**
   - Error: `column tournament_teams.tournamentId does not exist`
   - Fix: Creates the `tournament_teams` table with correct column names

2. **Season Teams Page**
   - Creates new page at `/seasons/[seasonId]/teams`
   - Shows all teams in a specific season
   - Same UI/UX as public teams page

---

## 📍 Pages You Can Now Visit

After migration:

1. **Season Detail**: http://localhost:3000/seasons/[seasonId]
   - Click "View Teams" button

2. **Season Teams**: http://localhost:3000/seasons/[seasonId]/teams
   - Shows teams in that season
   - Click any team to see details

3. **Tournament Standings**: http://localhost:3000/tournaments/[tournamentId]/standings
   - Shows tournament standings
   - Click any team to see details

---

## 🔍 Verify It Worked

After running migration, check:

1. No errors on tournament standings page ✅
2. Season teams page loads correctly ✅
3. All team cards are clickable ✅
4. Back buttons work ✅

---

## 💡 Troubleshooting

**"Unauthorized" error?**
- Make sure you're logged in as SUPER_ADMIN
- Log in at http://localhost:3000/super-admin first

**"Table already exists" message?**
- That's okay! The migration is safe to run multiple times
- It will skip creating the table and just populate data

**Still seeing errors?**
- Check the browser console for details
- Make sure dev server is running
- Try refreshing the page after migration

---

## 📁 Files Created/Updated

✅ `app/(public)/seasons/[seasonId]/teams/page.tsx` - NEW
✅ `prisma/migrations/add_tournament_teams.sql` - FIXED
✅ `app/api/admin/migrate-tournament-teams/route.ts` - FIXED
✅ `app/(public)/tournaments/[tournamentId]/standings/page.tsx` - UPDATED
✅ `run-migration.html` - NEW (migration tool)

---

That's it! 🎉
