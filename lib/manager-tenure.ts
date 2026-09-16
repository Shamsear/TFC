import { prisma } from './prisma'

export interface TenureStats {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

/**
 * Filter an ordered list of matches for a specific season team tenure window.
 * Boundaries are inclusive for toMatchId, and exclusive (starts after) for fromMatchId.
 */
export function filterMatchesByTenureWindow(
  matches: Array<{ id: string; [key: string]: any }>,
  fromMatchId: string | null | undefined,
  toMatchId: string | null | undefined
): Array<{ id: string; [key: string]: any }> {
  if (matches.length === 0) return []

  // If toMatchId is explicitly 'NONE', this tenure had 0 matches
  if (toMatchId === 'NONE') return []

  let startIndex = 0
  let endIndex = matches.length - 1

  if (fromMatchId) {
    const idx = matches.findIndex(m => m.id === fromMatchId)
    if (idx !== -1) {
      // fromMatchId is the boundary match of the PREVIOUS tenure, so this tenure starts AFTER it
      startIndex = idx + 1
    }
  }

  if (toMatchId) {
    const idx = matches.findIndex(m => m.id === toMatchId)
    if (idx !== -1) {
      endIndex = idx
    }
  }

  if (startIndex > endIndex) return []
  return matches.slice(startIndex, endIndex + 1)
}

/**
 * Computes W/D/L/GF/GA/GD/Pts from a list of completed matches for a given season team ID.
 */
export function computeMatchStats(
  matches: Array<{
    homeTeamId: string
    awayTeamId: string
    homeScore: number | null
    awayScore: number | null
    status: string
  }>,
  seasonTeamId: string
): TenureStats {
  let played = 0
  let won = 0
  let drawn = 0
  let lost = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const match of matches) {
    if (match.status === 'COMPLETED' && match.homeScore !== null && match.awayScore !== null) {
      if (match.homeTeamId === seasonTeamId) {
        played++
        goalsFor += match.homeScore
        goalsAgainst += match.awayScore
        if (match.homeScore > match.awayScore) won++
        else if (match.homeScore === match.awayScore) drawn++
        else lost++
      } else if (match.awayTeamId === seasonTeamId) {
        played++
        goalsFor += match.awayScore
        goalsAgainst += match.homeScore
        if (match.awayScore > match.homeScore) won++
        else if (match.awayScore === match.homeScore) drawn++
        else lost++
      }
    }
  }

  const points = won * 3 + drawn
  const goalDiff = goalsFor - goalsAgainst

  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDiff,
    points
  }
}

/**
 * Resolves the tenure-specific match stats for a manager on a specific season team.
 * If tenures exist, only returns stats for matches within the manager's tenure(s).
 * If no tenures exist, calculates stats from all completed matches for that season team.
 */
export async function getManagerTenureStats(
  seasonTeamId: string,
  managerName: string
): Promise<{ stats: TenureStats; matches: any[]; hasTenureSplit: boolean }> {
  // Check if any tenures exist for this season team
  const allTenures = await prisma.manager_tenures.findMany({
    where: { seasonTeamId },
    orderBy: { createdAt: 'asc' }
  })

  // Fetch all completed matches for this season team in chronological order
  const completedMatches = await prisma.matches.findMany({
    where: {
      status: 'COMPLETED',
      OR: [
        { homeTeamId: seasonTeamId },
        { awayTeamId: seasonTeamId }
      ]
    },
    include: {
      homeTeam: { select: { id: true, team: { select: { name: true, logoUrl: true } } } },
      awayTeam: { select: { id: true, team: { select: { name: true, logoUrl: true } } } },
      tournament: { select: { id: true, name: true } }
    },
    orderBy: [
      { matchDate: 'asc' },
      { createdAt: 'asc' }
    ]
  })

  if (allTenures.length === 0) {
    // No split on this team: all matches belong to the active manager
    const stats = computeMatchStats(completedMatches, seasonTeamId)
    return { stats, matches: completedMatches, hasTenureSplit: false }
  }

  // Find tenures for THIS manager
  const managerTenures = allTenures.filter(
    t => t.managerName.toLowerCase() === managerName.toLowerCase()
  )

  if (managerTenures.length === 0) {
    // There were tenures, but none for this manager name
    return {
      stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
      matches: [],
      hasTenureSplit: true
    }
  }

  // Gather all matches matching any of this manager's tenure windows
  const tenureMatchesSet = new Set<string>()
  const matchingMatches: any[] = []

  for (const tenure of managerTenures) {
    const windowMatches = filterMatchesByTenureWindow(
      completedMatches,
      tenure.fromMatchId,
      tenure.toMatchId
    )
    for (const m of windowMatches) {
      if (!tenureMatchesSet.has(m.id)) {
        tenureMatchesSet.add(m.id)
        matchingMatches.push(m)
      }
    }
  }

  // Sort matched matches chronologically
  matchingMatches.sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())

  const stats = computeMatchStats(matchingMatches, seasonTeamId)
  return { stats, matches: matchingMatches, hasTenureSplit: true }
}
