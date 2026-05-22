import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findAvailableLMFPlayers() {
  try {
    const seasonId = 'TFCS-4'
    
    // Get all LMF players in the season
    const lmfPlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        position: 'LMF'
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true
          }
        }
      },
      orderBy: {
        overallRating: 'desc'
      }
    })

    // Get players already in teams
    const transferredPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId
      },
      select: {
        basePlayerId: true
      }
    })

    const transferredPlayerIds = new Set(transferredPlayers.map(t => t.basePlayerId))

    // Filter out transferred players
    const availablePlayers = lmfPlayers.filter(p => !transferredPlayerIds.has(p.basePlayerId))

    console.log(`\n=== Available LMF Players (${availablePlayers.length}) ===\n`)
    
    availablePlayers.slice(0, 50).forEach((player, index) => {
      console.log(`${index + 1}. ${player.basePlayer.name}`)
      console.log(`   ID: ${player.basePlayer.id}`)
      console.log(`   Player ID: ${player.basePlayer.player_id}`)
      console.log(`   Rating: ${player.overallRating}`)
      console.log(`   Nationality: ${player.nationality || 'N/A'}`)
      console.log('')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findAvailableLMFPlayers()
