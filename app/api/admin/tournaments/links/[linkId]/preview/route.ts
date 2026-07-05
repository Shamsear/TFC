import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getQualifiedTeams, checkGuaranteedQualifications } from '@/lib/tournament-linking'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { linkId } = await params

    const link = await prisma.tournament_links.findUnique({
      where: { id: linkId },
      include: {
        sourceTournament: true,
        targetTournament: true
      }
    })

    if (!link) {
      return NextResponse.json({ error: 'Tournament link not found' }, { status: 404 })
    }

    // 1. Get teams currently qualifying based on standings
    const qualifiedTeams = await getQualifiedTeams(
      link.sourceTournamentId,
      link.linkType,
      link.qualificationConfig,
      link.id
    )

    // 2. Check which ones are mathematically confirmed
    const confirmedTeams = await checkGuaranteedQualifications(
      link.sourceTournamentId,
      link.id
    )
    const confirmedTeamIds = new Set(confirmedTeams.map(t => t.seasonTeamId))

    // 3. Check already populated teams
    const alreadyPopulated = await prisma.tournament_team_qualifications.findMany({
      where: { tournamentLinkId: link.id }
    })
    const alreadyPopulatedIds = new Set(alreadyPopulated.map(t => t.seasonTeamId))

    // 4. Fetch team metadata and current standing details
    const seasonTeamIds = qualifiedTeams.map(t => t.seasonTeamId)
    const teamsData = await prisma.season_teams.findMany({
      where: { id: { in: seasonTeamIds } },
      include: { team: true }
    })

    const standingsData = await prisma.standings.findMany({
      where: {
        tournamentId: link.sourceTournamentId,
        teamId: { in: seasonTeamIds }
      }
    })

    const teamsMap = new Map(teamsData.map(t => [t.id, t]))
    const standingsMap = new Map(standingsData.map(s => [s.teamId, s]))

    const preview = qualifiedTeams.map(q => {
      const seasonTeam = teamsMap.get(q.seasonTeamId)
      const standing = standingsMap.get(q.seasonTeamId)

      return {
        seasonTeamId: q.seasonTeamId,
        teamName: seasonTeam?.team?.name || 'Unknown Team',
        logoUrl: seasonTeam?.team?.logoUrl || null,
        points: standing?.points || 0,
        currentPosition: standing?.position || q.qualificationPosition,
        qualificationPosition: q.qualificationPosition,
        groupName: q.groupName,
        seedPosition: q.seedPosition,
        isConfirmed: confirmedTeamIds.has(q.seasonTeamId),
        isPopulated: alreadyPopulatedIds.has(q.seasonTeamId)
      }
    })

    // 5. Fetch details for excluded teams
    const config = (link.qualificationConfig || {}) as any
    const excludeTeamIds = config.excludeTeamIds || []
    let excluded: any[] = []

    if (excludeTeamIds.length > 0) {
      const excludedTeamsData = await prisma.season_teams.findMany({
        where: { id: { in: excludeTeamIds } },
        include: { team: true }
      })

      const excludedStandingsData = await prisma.standings.findMany({
        where: {
          tournamentId: link.sourceTournamentId,
          teamId: { in: excludeTeamIds }
        }
      })

      const exTeamsMap = new Map(excludedTeamsData.map(t => [t.id, t]))
      const exStandingsMap = new Map(excludedStandingsData.map(s => [s.teamId, s]))

      excluded = excludeTeamIds.map((teamId: string) => {
        const seasonTeam = exTeamsMap.get(teamId)
        const standing = exStandingsMap.get(teamId)

        return {
          seasonTeamId: teamId,
          teamName: seasonTeam?.team?.name || 'Unknown Team',
          logoUrl: seasonTeam?.team?.logoUrl || null,
          points: standing?.points || 0,
          currentPosition: standing?.position || 0,
          isExcluded: true,
          isConfirmed: false,
          isPopulated: false
        }
      })
    }

    const targetTeamsCount = await prisma.tournament_teams.count({
      where: { tournamentId: link.targetTournamentId }
    })

    return NextResponse.json({
      link,
      preview,
      excluded,
      summary: {
        total: preview.length,
        confirmed: confirmedTeams.length,
        provisional: preview.length - confirmedTeams.length,
        alreadyPopulated: alreadyPopulated.length,
        excluded: excluded.length,
        targetTeamsCount
      }
    })
  } catch (error: any) {
    console.error('Error previewing tournament link qualification:', error)
    return NextResponse.json(
      { error: 'Failed to preview qualification', details: error.message },
      { status: 500 }
    )
  }
}
