import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const playerId = 'TFCP-2'
  console.log('Searching for player:', playerId)
  
  const player = await prisma.base_players.findUnique({
    where: { id: playerId },
    include: {
      seasonalPlayerStats: {
        include: {
          season: true
        }
      }
    }
  })
  
  console.log('Player record:', player ? 'Found' : 'Not Found')
  if (player) {
    console.log('Name:', player.name)
    console.log('Seasonal stats count:', player.seasonalPlayerStats.length)
    player.seasonalPlayerStats.forEach(stats => {
      console.log(`- Season: ${stats.season.name} (${stats.season.id}), Active: ${stats.season.isActive}, Position: ${stats.position}`)
    })
  } else {
    // If not found, let's find ANY player or active seasons
    const anyPlayer = await prisma.base_players.findFirst()
    console.log('Any player:', anyPlayer ? anyPlayer.id : 'None')
  }

  const seasons = await prisma.seasons.findMany({
    orderBy: { createdAt: 'desc' }
  })
  console.log('\nAll Seasons:')
  seasons.forEach(s => {
    console.log(`- ${s.name} (${s.id}), Active: ${s.isActive}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
