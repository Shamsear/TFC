import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Applying season_number migration...\n')
  
  try {
    // Step 1: Add the column
    console.log('Step 1: Adding season_number column...')
    await prisma.$executeRaw`
      ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "season_number" INTEGER
    `
    console.log('✅ Column added\n')
    
    // Step 2: Update existing seasons with sequential numbers
    console.log('Step 2: Updating existing seasons...')
    await prisma.$executeRaw`
      WITH numbered_seasons AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as rn
        FROM seasons
      )
      UPDATE seasons
      SET season_number = numbered_seasons.rn
      FROM numbered_seasons
      WHERE seasons.id = numbered_seasons.id
    `
    console.log('✅ Existing seasons updated\n')
    
    // Step 3: Make it NOT NULL
    console.log('Step 3: Making season_number NOT NULL...')
    await prisma.$executeRaw`
      ALTER TABLE "seasons" ALTER COLUMN "season_number" SET NOT NULL
    `
    console.log('✅ Column set to NOT NULL\n')
    
    // Step 4: Add unique constraint
    console.log('Step 4: Adding unique constraint...')
    try {
      await prisma.$executeRaw`
        ALTER TABLE "seasons" ADD CONSTRAINT "seasons_season_number_key" UNIQUE ("season_number")
      `
      console.log('✅ Unique constraint added\n')
    } catch (error: any) {
      if (error.code === '42P07' || error.message.includes('already exists')) {
        console.log('⚠️  Constraint already exists, skipping\n')
      } else {
        throw error
      }
    }
    
    // Verify
    console.log('Verifying migration...')
    const seasons = await prisma.$queryRaw`
      SELECT id, season_number, name, "startingPurse", "isActive", "createdAt"
      FROM seasons
      ORDER BY season_number
    `
    
    console.log('✅ Migration complete!\n')
    console.log('Current seasons:')
    console.log(seasons)
    
    console.log('\n📝 Next steps:')
    console.log('1. Restart your dev server (Ctrl+C, then npm run dev)')
    console.log('2. Create a new season with season number 4')
    console.log('3. Verify the ID is TFCS-4')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('\n❌ Fatal Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
