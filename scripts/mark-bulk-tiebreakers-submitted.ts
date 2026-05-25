import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const prisma = new PrismaClient()

async function markBulkTiebreakersSubmitted() {
  try {
    console.log('Marking all bulk tiebreaker participants as submitted...')

    // Update all participants to submitted
    const result = await prisma.bulk_tiebreaker_participants.updateMany({
      where: {
        submitted: false
      },
      data: {
        submitted: true,
        submitted_at: new Date()
      }
    })

    console.log(`✓ Updated ${result.count} participants to submitted status`)

    // Verify the update
    const tiebreakers = await prisma.bulk_tiebreakers.findMany({
      include: {
        basePlayer: {
          select: {
            name: true
          }
        },
        participants: {
          select: {
            submitted: true,
            team: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    console.log('\nVerification:')
    console.log('=============')
    for (const tb of tiebreakers) {
      const submittedCount = tb.participants.filter(p => p.submitted).length
      const totalCount = tb.participants.length
      console.log(`Tiebreaker #${tb.id} - ${tb.basePlayer.name}:`)
      console.log(`  Submitted: ${submittedCount}/${totalCount}`)
      console.log(`  Status: ${tb.status}`)
      console.log('')
    }

    console.log('✓ All bulk tiebreaker participants marked as submitted')
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

markBulkTiebreakersSubmitted()
