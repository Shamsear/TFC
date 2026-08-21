import { prisma } from '@/lib/prisma'
import type { TeamStatRow } from '@/components/tournaments/TournamentStats'
import type { StandingRow } from '@/components/tournaments/TournamentTable'

export async function getTournamentTableData(tournamentId: string) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: { season: true },
  })
  if (!tournament) return null

  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    select: {
      id: true,
      teamId: true,
      groupName: true,
      position: true,
      played: true,
      won: true,
      drawn: true,
      lost: true,
      goalsFor: true,
      goalsAgainst: true,
      goalDiff: true,
      points: true,
      seasonTeam: {
        select: {
          id: true,
          managerName: true,
          team: {
            select: {
              id: true, name: true, logoUrl: true,
              managerLinks: { select: { managerId: true, manager: { select: { id: true } } }, take: 1 }
            }
          },
        },
      },
    },
    orderBy: [{ groupName: 'asc' }, { position: 'asc' }, { points: 'desc' }],
  })

  // Resolve managerId from season-specific managerName (not current team owner)
  const managerCache = new Map<string, string | null>()
  async function resolveManagerId(managerName: string | null): Promise<string | null> {
    if (!managerName) return null
    const key = managerName.toLowerCase()
    if (managerCache.has(key)) return managerCache.get(key)!
    const record = await prisma.managers.findFirst({
      where: { name: { equals: managerName, mode: 'insensitive' } }
    })
    managerCache.set(key, record?.id || null)
    return record?.id || null
  }

  const standingsWithManagerId = await Promise.all(standings.map(async s => ({
    ...s,
    managerId: await resolveManagerId(s.seasonTeam.managerName) || s.seasonTeam.team.managerLinks?.[0]?.managerId || null
  })))

  return { tournament, standings: standingsWithManagerId as StandingRow[] }
}

export async function getTournamentStatsData(tournamentId: string) {
  const tournament = await prisma.tournaments.findUnique({
    where: { id: tournamentId },
    include: { season: true },
  })
  if (!tournament) return null

  const standings = await prisma.standings.findMany({
    where: { tournamentId },
    select: {
      teamId: true,
      played: true,
      won: true,
      drawn: true,
      lost: true,
      goalsFor: true,
      goalsAgainst: true,
      goalDiff: true,
      points: true,
      seasonTeam: {
        select: {
          id: true,
          managerName: true,
          team: {
            select: {
              id: true, name: true, logoUrl: true,
              managerLinks: { select: { managerId: true, manager: { select: { id: true } } }, take: 1 }
            }
          },
        },
      },
    },
  })

  // For clean sheets we need to count completed matches where the team conceded 0
  const matches = await prisma.matches.findMany({
    where: { tournamentId, status: 'COMPLETED' },
    select: { homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  })

  const cleanSheetMap: Record<string, number> = {}
  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue
    if (m.awayScore === 0) cleanSheetMap[m.homeTeamId] = (cleanSheetMap[m.homeTeamId] ?? 0) + 1
    if (m.homeScore === 0) cleanSheetMap[m.awayTeamId] = (cleanSheetMap[m.awayTeamId] ?? 0) + 1
  }

  // Resolve managerIds from season-specific managerName
  const managerCache2 = new Map<string, string | null>()
  async function resolveId(managerName: string | null): Promise<string | null> {
    if (!managerName) return null
    const key = managerName.toLowerCase()
    if (managerCache2.has(key)) return managerCache2.get(key)!
    const record = await prisma.managers.findFirst({
      where: { name: { equals: managerName, mode: 'insensitive' } }
    })
    managerCache2.set(key, record?.id || null)
    return record?.id || null
  }

  const teams: TeamStatRow[] = await Promise.all(standings.map(async (s) => ({
    teamId: s.seasonTeam.team.id,
    managerId: await resolveId(s.seasonTeam.managerName) || s.seasonTeam.team.managerLinks?.[0]?.managerId || null,
    seasonTeamId: s.seasonTeam.id,
    teamName: s.seasonTeam.team.name,
    logoUrl: s.seasonTeam.team.logoUrl,
    played: s.played,
    won: s.won,
    drawn: s.drawn,
    lost: s.lost,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDiff: s.goalDiff,
    points: s.points,
    cleanSheets: cleanSheetMap[s.teamId] ?? 0,
  })))

  return { tournament, teams }
}
