import { prisma } from '../lib/prisma'
import { runTournamentStatusUpdate } from '../lib/tournament-linking'

async function fixTournament() {
  const tournamentId = 'TFCT-3'
  console.log(`Running status update check for ${tournamentId}...`)
  
  await runTournamentStatusUpdate(tournamentId)
  
  const updatedTournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, status: true }
  })
  
  console.log(`Updated Tournament Status:`, updatedTournament)
}

fixTournament()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect())
