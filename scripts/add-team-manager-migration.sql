-- ============================================
-- Migration: Add TEAM_MANAGER Role and Team Link
-- ============================================
-- This migration adds:
-- 1. TEAM_MANAGER role to UserRole enum
-- 2. team_id column to users table
-- 3. Foreign key relationship between users and teams
-- ============================================

-- Step 1: Add TEAM_MANAGER to UserRole enum
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'TEAM_MANAGER'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'TEAM_MANAGER';
  END IF;
END $$;

-- Step 2: Add team_id column to users table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "team_id" TEXT;
  END IF;
END $$;

-- Step 3: Add foreign key constraint (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_team_id_fkey'
  ) THEN
    ALTER TABLE "users" 
    ADD CONSTRAINT "users_team_id_fkey" 
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 4: Create index for better query performance (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_team_id_idx'
  ) THEN
    CREATE INDEX "users_team_id_idx" ON "users"("team_id");
  END IF;
END $$;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if TEAM_MANAGER role exists
SELECT enumlabel 
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'UserRole';

-- Check if team_id column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'team_id';

-- Check if foreign key exists
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints 
WHERE constraint_name = 'users_team_id_fkey';

-- Check if index exists
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexname = 'users_team_id_idx';

-- ============================================
-- Success Message
-- ============================================
SELECT 'Migration completed successfully!' AS status;
