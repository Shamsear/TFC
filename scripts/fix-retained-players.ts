/**
 * Script to fix retained players by creating transfer_history entries
 * Run this with: npx tsx scripts/fix-retained-players.ts
 */

import { PrismaClient } from '@prisma/client'
import { generateTransferId } from '../lib/id-generator'

const prisma = new PrismaClient()

async function fixRetainedPlayers() {
  console.log('Starting to fix retained players...\n')

  try {
    // Get all retention records
    const retentions = await prisma.retentions.findMany({
      include: {
        basePlayer: true,
        season: true
      }
    })

    console.log(`Found ${retentions.length} retention records\n`)

    let fixed = 0
    let skipped = 0

    for (const retention of retentions) {
      // Check if transfer history already exists for this player in the new season
      const existingTransfer = await prisma.transfer_history.findFirst({
        where: {
          seasonId: retention.seasonId,
          basePlayerId: retention.basePlayerId
        }
      })

      if (existingTransfer) {
        console.log(`⏭️  Skipping ${retention.basePlayer.name} - already has transfer in ${retention.season.name}`)
        skipped++
        continue
      }

      // Find the original transfer from the previous season
      const previousTransfer = await prisma.transfer_history.findFirst({
        where: {
          seasonId: retention.retainedFromSeasonId,
          basePlayerId: retention.basePlayerId
        },
        include: {
          team: true
        }
      })

      if (!previousTransfer) {
        console.log(`⚠️  Warning: No previous transfer found for ${retention.basePlayer.name}`)
        continue
      }

      // Create transfer history for the new season
      const transferId = await generateTransferId()
      await prisma.transfer_history.create({
        data: {
          id: transferId,
          seasonId: retention.seasonId,
          basePlayerId: retention.basePlayerId,
          teamId: previousTransfer.teamId,
          soldPrice: previousTransfer.soldPrice,
          status: 'ACTIVE'
        }
      })

      console.log(`✅ Fixed ${retention.basePlayer.name} - retained by ${previousTransfer.team.name} for $${previousTransfer.soldPrice.toLocaleString()}`)
      fixed++
    }

    console.log(`\n✨ Done!`)
    console.log(`   Fixed: ${fixed}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${retentions.length}`)

  } catch (error) {
    console.error('Error fixing retained players:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixRetainedPlayers()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
