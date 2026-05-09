# Phase 1: Database Schema Updates - COMPLETE ✅

## What Was Done

### 1. Updated Prisma Schema ✅
**File**: `prisma/schema.prisma`

#### Changes Made:
1. **Added TEAM_MANAGER to UserRole enum**
   ```prisma
   enum UserRole {
     SUPER_ADMIN
     SUB_ADMIN
     TEAM_MANAGER  // ← NEW
   }
   ```

2. **Added teamId field to users model**
   ```prisma
   model users {
     id              String   @id
     email           String   @unique
     name            String?
     role            UserRole @default(SUB_ADMIN)
     passwordHash    String
     teamId          String?  @map("team_id")  // ← NEW
     // ... other fields
     team            teams?   @relation("TeamManager", fields: [teamId], references: [id], onDelete: SetNull)  // ← NEW
   }
   ```

3. **Added relation to teams model**
   ```prisma
   model teams {
     id              String             @id
     name            String             @unique
     managerName     String
     logoUrl         String
     // ... other fields
     teamManagers    users[]            @relation("TeamManager")  // ← NEW
   }
   ```

### 2. Created Migration SQL ✅
**File**: `scripts/add-team-manager-migration.sql`

This SQL script:
- Adds `TEAM_MANAGER` to the `UserRole` enum
- Adds `team_id` column to `users` table
- Creates foreign key constraint linking users to teams
- Creates index on `team_id` for better performance
- Includes verification queries
- Safe to run multiple times (checks if changes already exist)

### 3. Generated Prisma Client ✅
- Ran `npx prisma generate`
- Prisma Client now includes TEAM_MANAGER role type
- TypeScript types updated automatically

---

## Database Schema Changes

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| team_id | TEXT (nullable) | Links user to their team (for TEAM_MANAGER role) |

### Relationships
- **users.team_id** → **teams.id** (Many-to-One)
- One team can have multiple team managers
- Team managers are linked to exactly one team
- If team is deleted, team_id is set to NULL (ON DELETE SET NULL)

### Indexes
- `users_team_id_idx` - Index on team_id for faster queries

---

## How to Apply Migration

### Option 1: Using SQL Script (Recommended)
```bash
# Connect to your Neon database and run:
psql <your-connection-string> -f scripts/add-team-manager-migration.sql
```

### Option 2: Using Prisma (When database is accessible)
```bash
npx prisma db push
```

---

## Verification

After running the migration, verify with these queries:

```sql
-- Check UserRole enum values
SELECT enumlabel FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'UserRole';
-- Should show: SUPER_ADMIN, SUB_ADMIN, TEAM_MANAGER

-- Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'team_id';
-- Should show: team_id | text | YES

-- Check foreign key
SELECT constraint_name FROM information_schema.table_constraints 
WHERE constraint_name = 'users_team_id_fkey';
-- Should show: users_team_id_fkey
```

---

## What's Next

### Phase 2: Authentication Updates
Now that the database schema is ready, we can:
1. Update `lib/auth.ts` to handle TEAM_MANAGER role
2. Add team info to JWT token and session
3. Create authorization middleware for team routes
4. Update the existing login page to support team managers

---

## TypeScript Types Available

With the updated Prisma schema, you now have:

```typescript
import { UserRole } from '@prisma/client'

// UserRole enum values:
UserRole.SUPER_ADMIN
UserRole.SUB_ADMIN
UserRole.TEAM_MANAGER  // ← NEW

// User type now includes:
type User = {
  id: string
  email: string
  name: string | null
  role: UserRole
  teamId: string | null  // ← NEW
  // ... other fields
}
```

---

## Status: ✅ READY FOR PHASE 2

Phase 1 is complete! The database schema is updated and ready for team manager functionality.

**Next Step**: Run the migration SQL script on your Neon database, then we'll proceed to Phase 2 (Authentication Updates).
