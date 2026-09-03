import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { resolveTeamManagerNames } from '@/lib/resolve-manager'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params

    // Fetch target season
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { id: true, name: true, seasonNumber: true }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Fetch all active seasons for the dropdown switcher
    const allSeasons = await prisma.seasons.findMany({
      select: { id: true, name: true, seasonNumber: true },
      orderBy: { seasonNumber: 'desc' }
    })

    // Fetch all teams in this season
    const seasonTeams = await prisma.season_teams.findMany({
      where: { seasonId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            managerName: true
          }
        }
      }
    })

    const teamIds = seasonTeams.map(st => st.teamId)
    const mgrMap = await resolveTeamManagerNames(teamIds, seasonId)

    const teams = seasonTeams.map(st => ({
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
      managerName: mgrMap.get(st.team.id) || st.managerName || st.team.managerName
    }))

    // Fetch all non-draft auction rounds in this season
    const rounds = await prisma.rounds.findMany({
      where: {
        seasonId,
        status: { in: ['active', 'finalizing', 'finalized', 'completed'] }
      },
      orderBy: { roundNumber: 'asc' }
    })

    if (rounds.length === 0) {
      return NextResponse.json({
        season,
        allSeasons,
        totalRounds: 0,
        teamsPerfect: teams.map(t => ({
          ...t,
          totalRounds: 0,
          submittedRoundsCount: 0,
          missedRoundsCount: 0,
          missedRounds: []
        })),
        teamsWithMissedBids: [],
        roundsSummary: []
      })
    }

    const roundIds = rounds.map(r => r.id)

    // 1. Fetch normal team bids for these rounds
    const normalBids = await prisma.team_round_bids.findMany({
      where: {
        roundId: { in: roundIds }
      },
      select: {
        roundId: true,
        teamId: true,
        submitted: true,
        bidCount: true,
        encryptedBids: true
      }
    })

    // 2. Fetch bulk round selections for these rounds
    const bulkSelections = await prisma.bulk_round_selections.findMany({
      where: {
        roundId: { in: roundIds }
      },
      select: {
        roundId: true,
        teamId: true,
        submitted: true,
        selectedPlayers: true
      }
    })

    // Create lookup map: `${roundId}_${teamId}` -> boolean (submitted valid non-empty bids & not skipped)
    const validSubmissionMap = new Map<string, boolean>()

    normalBids.forEach(b => {
      let isSkipped = false
      if (b.encryptedBids) {
        if (b.encryptedBids.includes('"skipped":true') || b.encryptedBids.includes('"skipped": true')) {
          isSkipped = true
        }
      }
      if (b.submitted && b.bidCount > 0 && !isSkipped) {
        validSubmissionMap.set(`${b.roundId}_${b.teamId}`, true)
      }
    })

    bulkSelections.forEach(s => {
      if (s.submitted) {
        try {
          const parsed = JSON.parse(s.selectedPlayers)
          const players = Array.isArray(parsed) ? parsed : (parsed?.players || [])
          if (players.length > 0) {
            validSubmissionMap.set(`${s.roundId}_${s.teamId}`, true)
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    })

    // Process Team statistics
    const teamStats = teams.map(team => {
      const missedRounds: Array<{
        id: string
        roundNumber: number
        position: string | null
        roundType: string
        status: string
        position_group: string | null
      }> = []

      let submittedCount = 0

      rounds.forEach(round => {
        const hasSubmitted = validSubmissionMap.get(`${round.id}_${team.id}`) || false
        if (hasSubmitted) {
          submittedCount++
        } else {
          missedRounds.push({
            id: round.id,
            roundNumber: round.roundNumber,
            position: round.position,
            roundType: round.roundType,
            status: round.status,
            position_group: round.position_group
          })
        }
      })

      return {
        ...team,
        totalRounds: rounds.length,
        submittedRoundsCount: submittedCount,
        missedRoundsCount: missedRounds.length,
        missedRounds
      }
    })

    const teamsPerfect = teamStats
      .filter(t => t.missedRoundsCount === 0)
      .sort((a, b) => a.name.localeCompare(b.name))

    const teamsWithMissedBids = teamStats
      .filter(t => t.missedRoundsCount > 0)
      .sort((a, b) => b.missedRoundsCount - a.missedRoundsCount || a.name.localeCompare(b.name))

    // Process Round-by-Round breakdown
    const roundsSummary = rounds.map(round => {
      const submittedTeams: Array<{ id: string; name: string; logoUrl: string; managerName: string }> = []
      const missedTeams: Array<{ id: string; name: string; logoUrl: string; managerName: string }> = []

      teams.forEach(team => {
        const hasSubmitted = validSubmissionMap.get(`${round.id}_${team.id}`) || false
        if (hasSubmitted) {
          submittedTeams.push(team)
        } else {
          missedTeams.push(team)
        }
      })

      return {
        id: round.id,
        roundNumber: round.roundNumber,
        position: round.position,
        roundType: round.roundType,
        status: round.status,
        position_group: round.position_group,
        submittedCount: submittedTeams.length,
        missedCount: missedTeams.length,
        submittedTeams,
        missedTeams
      }
    })

    return NextResponse.json({
      season,
      allSeasons,
      totalRounds: rounds.length,
      teamsPerfect,
      teamsWithMissedBids,
      roundsSummary
    })
  } catch (error: any) {
    console.error('Error fetching missed bids audit:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
