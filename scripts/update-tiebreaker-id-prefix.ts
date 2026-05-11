/**
 * Initialize Tiebreaker ID Prefix (TFCTB)
 * This script initializes the TFCTB counter in id_counters table
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTiebreakerIdPrefix() {
  try {
    console.log('🔄 Initializing tiebreaker ID prefix TFCTB...\n')

    // Initialize TFCTB counter
    await prisma.$executeRaw`
      INSERT INTO id_counters (prefix, counter, updated_at)
      VALUES ('TFCTB', 0, NOW())
      ON CONFLICT (prefix) DO NOTHING
    `
    console.log(`✅ Initialized TFCTB counter`)

    // Verify the change
    const result = await prisma.$queryRaw<Array<{ prefix: string; counter: number }>>`
      SELECT prefix, counter 
      FROM id_counters 
      WHERE prefix = 'TFCTB'
    `

    console.log('\n📊 Current state:')
    result.forEach(row => {
      console.log(`   ${row.prefix}: ${row.counter}`)
    })

    console.log('\n✅ Tiebreaker ID prefix initialization complete!')
    console.log('   New tiebreaker IDs will be generated as: TFCTB-1, TFCTB-2, etc.')

  } catch (error) {
    console.error('❌ Error initializing tiebreaker ID prefix:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updateTiebreakerIdPrefix()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
