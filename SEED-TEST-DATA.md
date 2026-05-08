# Test Data Seeding Guide

This guide explains how to seed your database with test data for testing Sub Admin features.

## What Gets Created

Running the seed script will create:

- **6 Teams** with managers and logos
  - Thunder Strikers (John Smith)
  - Lightning Bolts (Sarah Johnson)
  - Phoenix Rising (Mike Davis)
  - Dragon Warriors (Emily Chen)
  - Storm Chasers (David Wilson)
  - Titan Force (Lisa Anderson)

- **1 Active Season**
  - Season 2026
  - Starting Purse: $1,000,000 per team
  - All 6 teams are linked to this season

- **30 Players** distributed across positions:
  - 5 Goalkeepers (GK)
  - 5 Defenders (DEF)
  - 10 Midfielders (MID)
  - 10 Forwards (FWD)
  - All players have seasonal stats for Season 2026

## How to Run

### Option 1: Using npm script (Recommended)

```bash
npm run seed:test
```

### Option 2: Using node directly

```bash
node seed-test-data.js
```

### Option 3: Using SQL directly in Neon Console

1. Go to your Neon Console: https://console.neon.tech
2. Select your project
3. Go to SQL Editor
4. Copy the contents of `prisma/seed-test-data.sql`
5. Paste and execute

## What You Can Test After Seeding

Once the data is seeded, you can test all Sub Admin features:

### 1. Team Selection
- Navigate to: `/sub-admin/season-001/teams`
- The 6 teams are already linked to the season
- You can view and manage team participation

### 2. Player Retention
- Navigate to: `/sub-admin/season-001/retention`
- Select teams and retain players before the auction
- Test retention limits and budget deductions

### 3. Live Auction
- Navigate to: `/sub-admin/season-001/auction`
- Conduct a live auction with 30 available players
- Test bidding, budget management, and player assignments

## Player Distribution

### Goalkeepers (5)
- Alex Martinez (85) - Manchester United
- David Thompson (82) - Liverpool
- Carlos Silva (80) - Chelsea
- Marco Rossi (78) - Arsenal
- Lucas Weber (76) - Tottenham

### Defenders (5)
- James Wilson (88) - Manchester City
- Roberto Garcia (86) - Real Madrid
- Thomas Mueller (84) - Bayern Munich
- Pierre Dubois (82) - PSG
- Antonio Conte (80) - Juventus

### Midfielders (10)
- Kevin Anderson (90) - Manchester United
- Bruno Santos (89) - Barcelona
- Luka Modric Jr (87) - Real Madrid
- Paul Scholes II (86) - Manchester City
- Andrea Pirlo Jr (85) - AC Milan
- Xavi Hernandez II (84) - Barcelona
- Frank Lampard Jr (83) - Chelsea
- Steven Gerrard II (82) - Liverpool
- Zinedine Zidane II (81) - Real Madrid
- Iniesta Jr (80) - Barcelona

### Forwards (10)
- Cristiano Silva (92) - Manchester United
- Lionel Martinez (91) - Barcelona
- Neymar Santos (89) - PSG
- Kylian Johnson (88) - Real Madrid
- Erling Anderson (87) - Manchester City
- Mohamed Wilson (86) - Liverpool
- Harry Davis (85) - Tottenham
- Robert Brown (84) - Bayern Munich
- Sergio Garcia (83) - Manchester City
- Luis Rodriguez (82) - Barcelona

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

This means the data already exists. You can either:

1. Delete existing data first:
```sql
DELETE FROM "SeasonalPlayerStats" WHERE "seasonId" = 'season-001';
DELETE FROM "SeasonTeam" WHERE "seasonId" = 'season-001';
DELETE FROM "Season" WHERE id = 'season-001';
DELETE FROM "Player" WHERE id LIKE 'player-%';
DELETE FROM "Team" WHERE id LIKE 'team-%';
```

2. Or modify the IDs in `prisma/seed-test-data.sql` to use different values

### Error: "relation does not exist"

Make sure you've run the Prisma migrations:
```bash
npm run prisma:migrate
```

## Clean Up Test Data

To remove all test data:

```sql
-- Run this in Neon SQL Editor
DELETE FROM "SeasonalPlayerStats" WHERE "seasonId" = 'season-001';
DELETE FROM "SeasonTeam" WHERE "seasonId" = 'season-001';
DELETE FROM "TransferHistory" WHERE "seasonId" = 'season-001';
DELETE FROM "Season" WHERE id = 'season-001';
DELETE FROM "Player" WHERE id LIKE 'player-%';
DELETE FROM "Team" WHERE id LIKE 'team-%';
```

## Notes

- All teams start with $1,000,000 budget
- The season is marked as active
- Player ratings range from 76 to 92
- Placeholder images are used for logos and photos
- You can modify the SQL file to customize the data
