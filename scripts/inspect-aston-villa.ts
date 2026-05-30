import { prisma } from '../lib/prisma'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
  const team = await prisma.teams.findFirst({
    where: { name: { equals: 'Aston Villa', mode: 'insensitive' } },
    include: {
      seasonTeams: true,
      managerLinks: true,
      teamManagers: true,
    }
  })

  console.log('--- INSPECTING ASTON VILLA TEAM (TFCM-8) ---')
  if (!team) {
    console.log('No team named Aston Villa found.')
    return
  }
  console.log('Team Details:', JSON.stringify(team, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
