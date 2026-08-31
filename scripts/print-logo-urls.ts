import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const teamNames = ['Burnley FC', 'Crystal Palace FC', 'FC Porto']
  const teams = await prisma.teams.findMany({
    where: { name: { in: teamNames } }
  })
  console.log('Current URLs in DB:')
  for (const t of teams) {
    console.log(`- Team: ${t.name} | Logo: "${t.logoUrl}"`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
