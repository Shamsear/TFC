/**
 * Update Transfer History ID Prefix from TFCTR to TFCTH
 * This script updates the id_counters table to use the new prefix
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateTransferIdPrefix() {
  try {
    console.log('🔄 Updating transfer ID prefix from TFCTR to TFCTH...\n')

    // Check if TFCTR exists
    const oldCounter = await prisma.$queryRaw<Array<{ counter: number }>>`
      SELECT counter FROM id_counters WHERE prefix = 'TFCTR'
    `

    if (oldCounter.length > 0) {
      const counter = oldCounter[0].counter
      console.log(`✅ Found TFCTR with counter: ${counter}`)

      // Insert or update TFCTH with the counter from TFCTR
      await prisma.$executeRaw`
        INSERT INTO id_counters (prefix, counter, updated_at)
        VALUES ('TFCTH', ${counter}, NOW())
        ON CONFLICT (prefix) 
        DO UPDATE SET 
          counter = GREATEST(id_counters.counter, ${counter}),
          updated_at = NOW()
      `
      console.log(`✅ Migrated counter to TFCTH`)

      // Delete the old TFCTR entry
      await prisma.$executeRaw`
        DELETE FROM id_counters WHERE prefix = 'TFCTR'
      `
      console.log(`✅ Deleted old TFCTR entry`)
    } else {
      console.log('ℹ️  TFCTR not found, initializing TFCTH...')
      
      // Just ensure TFCTH exists
      await prisma.$executeRaw`
        INSERT INTO id_counters (prefix, counter, updated_at)
        VALUES ('TFCTH', 0, NOW())
        ON CONFLICT (prefix) DO NOTHING
      `
      console.log(`✅ Initialized TFCTH counter`)
    }

    // Verify the change
    const result = await prisma.$queryRaw<Array<{ prefix: string; counter: number }>>`
      SELECT prefix, counter 
      FROM id_counters 
      WHERE prefix IN ('TFCTR', 'TFCTH')
      ORDER BY prefix
    `

    console.log('\n📊 Current state:')
    result.forEach(row => {
      console.log(`   ${row.prefix}: ${row.counter}`)
    })

    console.log('\n✅ Transfer ID prefix update complete!')
    console.log('   New transfer IDs will be generated as: TFCTH-1, TFCTH-2, etc.')

  } catch (error) {
    console.error('❌ Error updating transfer ID prefix:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updateTransferIdPrefix()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
