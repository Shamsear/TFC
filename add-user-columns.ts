import 'dotenv/config'
import { prisma } from './lib/prisma'

async function addColumns() {
  try {
    console.log('Adding columns to users table...')
    
    // Add created_by column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "created_by" TEXT
    `)
    console.log('✓ Added created_by column')
    
    // Add is_active column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true
    `)
    console.log('✓ Added is_active column')
    
    // Add assigned_seasons column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "assigned_seasons" JSONB DEFAULT '[]'::jsonb
    `)
    console.log('✓ Added assigned_seasons column')
    
    // Add indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "users"("created_by")
    `)
    console.log('✓ Added created_by index')
    
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users"("is_active")
    `)
    console.log('✓ Added is_active index')
    
    console.log('\n✓ All columns added successfully!')
  } catch (error: any) {
    console.error('✗ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

addColumns()
