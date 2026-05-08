# Quick Seed Instructions

Since Prisma can't execute multiple SQL statements at once, please follow these steps to seed the test data:

## Steps:

1. **Open Neon SQL Editor**
   - Go to: https://console.neon.tech
   - Select your project
   - Click on "SQL Editor" in the left sidebar

2. **Copy the SQL**
   - Open the file: `prisma/seed-test-data.sql`
   - Copy ALL the contents (Ctrl+A, Ctrl+C)

3. **Execute in Neon**
   - Paste the SQL into the Neon SQL Editor
   - Click "Run" button
   - Wait for completion

4. **Verify**
   - You should see success messages
   - The database now has:
     - 6 Teams
     - 1 Active Season (Season 2026)
     - 30 Players
     - All linked together

## What You Get:

### Teams (6):
1. Thunder Strikers - John Smith
2. Lightning Bolts - Sarah Johnson
3. Phoenix Rising - Mike Davis
4. Dragon Warriors - Emily Chen
5. Storm Chasers - David Wilson
6. Titan Force - Lisa Anderson

### Season:
- **Season 2026** (Active)
- Starting Purse: $1,000,000 per team
- All 6 teams are participating

### Players (30):
- 5 Goalkeepers (ratings: 76-85)
- 5 Defenders (ratings: 80-88)
- 10 Midfielders (ratings: 80-90)
- 10 Forwards (ratings: 82-92)

## Test Sub Admin Features:

After seeding, you can test:

1. **Team Selection**: `/sub-admin/season-001/teams`
2. **Player Retention**: `/sub-admin/season-001/retention`
3. **Live Auction**: `/sub-admin/season-001/auction`

## Alternative: Manual Creation

If you prefer, you can also create the data manually through the UI:

1. Sign in as Super Admin
2. Create 6 teams via `/super-admin/teams/new`
3. Create 1 season via `/super-admin/seasons/new`
4. Import players via `/sub-admin/import` (you'll need a .db file)

But using the SQL script is much faster! 🚀
