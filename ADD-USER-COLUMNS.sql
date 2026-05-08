-- Add new columns to users table for sub-admin management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "created_by" TEXT,
ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "assigned_seasons" JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "users"("created_by");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active");
CREATE INDEX IF NOT EXISTS "users_name_idx" ON "users"("name");
