import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting migration: add position_hidden columns...')

  try {
    // Add position_hidden to rounds table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE rounds 
      ADD COLUMN IF NOT EXISTS position_hidden BOOLEAN NOT NULL DEFAULT false;
    `)
    console.log('✓ Added position_hidden column to rounds table')

    // Add positionHidden to auction_slots table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE auction_slots
      ADD COLUMN IF NOT EXISTS "positionHidden" BOOLEAN NOT NULL DEFAULT false;
    `)
    console.log('✓ Added positionHidden column to auction_slots table')

    // Add comments
    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN rounds.position_hidden IS 'When true, the position is hidden from teams until revealed by admin';
    `)
    console.log('✓ Added comment to rounds.position_hidden')

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN auction_slots."positionHidden" IS 'When true, the position is hidden from teams until revealed by admin';
    `)
    console.log('✓ Added comment to auction_slots.positionHidden')

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
