import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get current season
    const currentSeason = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { seasonNumber: true, name: true }
    })

    if (!currentSeason) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Get previous season (seasonNumber - 1)
    const previousSeason = await prisma.seasons.findFirst({
      where: {
        seasonNumber: currentSeason.seasonNumber - 1
      },
      select: { id: true, name: true, seasonNumber: true }
    })

    if (!previousSeason) {
      return NextResponse.json({ 
        eligiblePlayers: [], 
        message: 'No previous season found',
        previousSeason: null 
      })
    }

    // 1. Get the current user's team and manager name
    const currentTeam = await prisma.teams.findUnique({
      where: { id: session.user.teamId }
    })

    if (!currentTeam) {
      return NextResponse.json({ error: 'Current team not found' }, { status: 404 })
    }

    const managerName = currentTeam.managerName

    // 2. Verify manager participated in previous season (under ANY team name)
    const previousSeasonTeam = await prisma.season_teams.findFirst({
      where: {
        seasonId: previousSeason.id,
        managerName: managerName
      }
    })

    if (!previousSeasonTeam) {
      return NextResponse.json({ 
        eligiblePlayers: [], 
        message: `Manager ${managerName} did not participate in ${previousSeason.name}`,
        previousSeason 
      })
    }

    // 3. Get all players from previous season that are ACTIVE, using the old teamId!
    const previousSeasonPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId: previousSeason.id,
        teamId: previousSeasonTeam.teamId, // Uses the team they managed LAST season
        status: 'ACTIVE',
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true,
            photoUrl: true,
          },
        },
      },
    })

    // Get players already in current season squad
    const currentSeasonPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        teamId: session.user.teamId,
        status: 'ACTIVE',
      },
      select: {
        basePlayerId: true,
      },
    })

    const currentSeasonPlayerIds = new Set(currentSeasonPlayers.map(p => p.basePlayerId))

    // Get pending retention requests for current season
    const pendingRequests = await prisma.retention_requests.findMany({
      where: {
        seasonId,
        teamId: session.user.teamId,
        status: 'pending',
      },
      select: {
        playerId: true,
      },
    })

    const pendingPlayerIds = new Set(pendingRequests.map(r => r.playerId))

    // Filter eligible players (not in current squad and no pending request)
    const eligiblePlayers = previousSeasonPlayers
      .filter(transfer => 
        !currentSeasonPlayerIds.has(transfer.basePlayerId) && 
        !pendingPlayerIds.has(transfer.basePlayerId)
      )
      .map(transfer => ({
        id: transfer.basePlayer.id,
        name: transfer.basePlayer.name,
        player_id: transfer.basePlayer.player_id,
        photoUrl: transfer.basePlayer.photoUrl,
        oldSquadValue: transfer.soldPrice,
        previousSeasonId: previousSeason.id,
        previousSeasonName: previousSeason.name,
      }))

    return NextResponse.json({ 
      eligiblePlayers,
      previousSeason,
      message: eligiblePlayers.length === 0 
        ? 'All players from previous season are either in your current squad or have pending retention requests'
        : undefined
    })
  } catch (error: any) {
    console.error('Error fetching eligible players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible players' },
      { status: 500 }
    )
  }
}
