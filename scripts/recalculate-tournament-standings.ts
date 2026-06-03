import { prisma } from '../lib/prisma'

async function recalculateStandings(tournamentId: string) {
  console.log(`🔄 Recalculating standings for tournament: ${tournamentId}`)

  // Get tournament details
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: {
      matches: {
        where: {
          status: {
            in: ['COMPLETED', 'WALKOVER']
          }
        },
        include: {
          homeTeam: { include: { team: true } },
          awayTeam: { include: { team: true } }
        }
      },
      standings: {
        include: {
          seasonTeam: { include: { team: true } }
        }
      }
    }
  })

  if (!tournament) {
    console.error(`❌ Tournament not found: ${tournamentId}`)
    return
  }

  console.log(`📊 Found ${tournament.matches.length} completed matches`)
  console.log(`📋 Current standings entries: ${tournament.standings.length}`)

  // Reset all standings to zero
  await prisma.standings.updateMany({
    where: { tournamentId },
    data: {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0
    }
  })

  console.log('🔄 Reset all standings to zero')

  // Recalculate from matches
  for (const match of tournament.matches) {
    if (match.homeScore === null || match.awayScore === null) continue

    const homeScore = match.homeScore
    const awayScore = match.awayScore
    const isWalkover = match.status === 'WALKOVER'

    // Calculate points and results
    let homePoints = 0, awayPoints = 0
    let homeWon = 0, awayWon = 0, homeDrawn = 0, awayDrawn = 0, homeLost = 0, awayLost = 0

    if (homeScore > awayScore) {
      homePoints = 3
      homeWon = 1
      awayLost = 1
    } else if (awayScore > homeScore) {
      awayPoints = 3
      awayWon = 1
      homeLost = 1
    } else {
      homePoints = 1
      awayPoints = 1
      homeDrawn = 1
      awayDrawn = 1
    }

    // Goals (not counted for walkovers)
    const homeGoals = isWalkover ? 0 : homeScore
    const awayGoals = isWalkover ? 0 : awayScore

    // Update home team
    await prisma.standings.updateMany({
      where: {
        tournamentId,
        teamId: match.homeTeamId,
        ...(match.groupId ? { groupName: match.group?.name } : {})
      },
      data: {
        played: { increment: 1 },
        won: { increment: homeWon },
        drawn: { increment: homeDrawn },
        lost: { increment: homeLost },
        goalsFor: { increment: homeGoals },
        goalsAgainst: { increment: awayGoals },
        goalDiff: { increment: homeGoals - awayGoals },
        points: { increment: homePoints }
      }
    })

    // Update away team
    await prisma.standings.updateMany({
      where: {
        tournamentId,
        teamId: match.awayTeamId,
        ...(match.groupId ? { groupName: match.group?.name } : {})
      },
      data: {
        played: { increment: 1 },
        won: { increment: awayWon },
        drawn: { increment: awayDrawn },
        lost: { increment: awayLost },
        goalsFor: { increment: awayGoals },
        goalsAgainst: { increment: homeGoals },
        goalDiff: { increment: awayGoals - homeGoals },
        points: { increment: awayPoints }
      }
    })
  }

  // Fetch updated standings
  const updatedStandings = await prisma.standings.findMany({
    where: { tournamentId },
    orderBy: [
      { points: 'desc' },
      { goalDiff: 'desc' },
      { goalsFor: 'desc' }
    ],
    include: {
      seasonTeam: { include: { team: true } }
    }
  })

  console.log('\n✅ Standings recalculated successfully!')
  console.log('\n📊 Updated Standings:')
  console.log('Pos | Team | P | W | D | L | GF | GA | GD | Pts')
  console.log(''.padEnd(60, '-'))
  
  updatedStandings.forEach((s, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(2)} | ` +
      `${s.seasonTeam.team.name.padEnd(20)} | ` +
      `${s.played.toString().padStart(2)} | ` +
      `${s.won.toString().padStart(2)} | ` +
      `${s.drawn.toString().padStart(2)} | ` +
      `${s.lost.toString().padStart(2)} | ` +
      `${s.goalsFor.toString().padStart(2)} | ` +
      `${s.goalsAgainst.toString().padStart(2)} | ` +
      `${s.goalDiff.toString().padStart(3)} | ` +
      `${s.points.toString().padStart(2)}`
    )
  })

  await prisma.$disconnect()
}

const tournamentId = process.argv[2]

if (!tournamentId) {
  console.error('Usage: npx tsx scripts/recalculate-tournament-standings.ts <tournamentId>')
  console.error('Example: npx tsx scripts/recalculate-tournament-standings.ts TFCT-3')
  process.exit(1)
}

recalculateStandings(tournamentId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
