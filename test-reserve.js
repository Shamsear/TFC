const { PrismaClient } = require('@prisma/client')
const { calculateReserve } = require('./lib/auction/reserve-calculator-v2')

async function main() {
  const prisma = new PrismaClient()
  try {
    // Get a team from the season_teams table for the current season
    const st = await prisma.season_teams.findFirst({
      where: { seasonId: 'TFCS-4' }
    })
    if (!st) {
      console.log('No teams found in season TFCS-4')
      return
    }

    // Get a round from the rounds table
    const round = await prisma.rounds.findFirst({
      where: { seasonId: 'TFCS-4' }
    })
    if (!round) {
      console.log('No rounds found in season TFCS-4')
      return
    }

    console.log(`Calculating reserve for Team ID: ${st.teamId}, Round ID: ${round.id}, Season ID: TFCS-4`)
    const reserveInfo = await calculateReserve(st.teamId, round.id, 'TFCS-4')
    console.log('--- Reserve Info Result ---')
    console.log(JSON.stringify(reserveInfo, null, 2))
  } catch (error) {
    console.error('Error running test-reserve:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
