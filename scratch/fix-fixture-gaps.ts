import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configurable inputs
const TOURNAMENT_ID = 'TFCT-3' // Target tournament
const USE_CONSECUTIVE_DAYS = true // true = consecutive days (no gaps), false = same day

async function main() {
  console.log(`Fetching tournament info for: ${TOURNAMENT_ID}...`)
  const tournament = await prisma.tournaments.findUnique({
    where: { id: TOURNAMENT_ID },
    include: {
      matches: {
        orderBy: { matchDate: 'asc' }
      }
    }
  })

  if (!tournament) {
    console.error(`Tournament ${TOURNAMENT_ID} not found.`)
    return
  }

  console.log(`Tournament: ${tournament.name}`)
  console.log(`Total matches: ${tournament.matches.length}`)

  if (tournament.matches.length === 0) {
    console.log('No matches found for this tournament.')
    return
  }

  // Find the earliest match date to use as base start date
  const baseStartDate = new Date(tournament.matches[0].matchDate)
  console.log(`Base Start Date detected (from first match): ${baseStartDate.toISOString()}`)

  // Group matches by round
  const matchesByRound: Record<string, typeof tournament.matches> = {}
  tournament.matches.forEach(match => {
    const roundName = match.round || 'Round 1'
    if (!matchesByRound[roundName]) {
      matchesByRound[roundName] = []
    }
    matchesByRound[roundName].push(match)
  })

  // Helper to extract round number from string (e.g. "Matchday 12" -> 12, "Round 3" -> 3)
  const getRoundNumber = (roundName: string): number => {
    const num = roundName.match(/\d+/)
    return num ? parseInt(num[0], 10) : 1
  }

  // Sort rounds numerically
  const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
    return getRoundNumber(a) - getRoundNumber(b)
  })

  console.log(`Detected rounds:`, sortedRounds)

  console.log('Rescheduling matches...')
  let updatedCount = 0

  for (let i = 0; i < sortedRounds.length; i++) {
    const roundName = sortedRounds[i]
    const roundMatches = matchesByRound[roundName]
    
    // Calculate new date for this round
    // If USE_CONSECUTIVE_DAYS is true, each round is 1 day after the previous
    // Day offset: Round 1 (index 0) -> 0 days offset, Round 2 -> 1 day offset, etc.
    const dayOffset = USE_CONSECUTIVE_DAYS ? i : 0
    const newDate = new Date(baseStartDate.getTime())
    newDate.setDate(baseStartDate.getDate() + dayOffset)

    console.log(`Rescheduling ${roundName} to: ${newDate.toLocaleDateString()} (Total ${roundMatches.length} matches)`)

    for (const match of roundMatches) {
      // Retain the original time of the match, only update year/month/day
      const matchNewDate = new Date(newDate.getTime())
      const originalTime = new Date(match.matchDate)
      matchNewDate.setHours(originalTime.getHours())
      matchNewDate.setMinutes(originalTime.getMinutes())
      matchNewDate.setSeconds(originalTime.getSeconds())

      await prisma.matches.update({
        where: { id: match.id },
        data: {
          matchDate: matchNewDate
        }
      })
      updatedCount++
    }
  }

  console.log(`Success! Updated dates for ${updatedCount} matches.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
