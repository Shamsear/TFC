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
          team: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
    orderBy: [{ groupName: 'asc' }, { position: 'asc' }, { points: 'desc' }],
  })

  return { tournament, standings: standings as StandingRow[] }
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
          team: { select: { id: true, name: true, logoUrl: true } },
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

  const teams: TeamStatRow[] = standings.map((s) => ({
    teamId: s.seasonTeam.team.id,
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
  }))

  return { tournament, teams }
}
