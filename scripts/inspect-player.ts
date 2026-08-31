import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const query = 'Cahill'
  const players = await prisma.base_players.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' }
    }
  })
  
  console.log(`Found ${players.length} players matching "${query}":`)
  for (const p of players) {
    console.log(`- Name: "${p.name}" | ID: "${p.id}" | PlayerID: "${p.player_id}" | PhotoURL: "${p.photoUrl}"`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
