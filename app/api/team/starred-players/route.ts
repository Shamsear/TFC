import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get all starred players for a team in a season
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.team_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.team_id,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Get starred players
    const starredPlayers = await prisma.starred_players.findMany({
      where: {
        seasonTeamId: seasonTeam.id,
        seasonId: seasonId,
      },
      select: {
        playerId: true,
      },
    })

    return NextResponse.json({
      starredPlayerIds: starredPlayers.map(sp => sp.playerId),
    })
  } catch (error) {
    console.error('Error fetching starred players:', error)
    return NextResponse.json({ error: 'Failed to fetch starred players' }, { status: 500 })
  }
}

// POST - Star a player
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.team_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, seasonId } = body

    if (!playerId || !seasonId) {
      return NextResponse.json({ error: 'Player ID and Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.team_id,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Star the player (upsert to handle duplicates)
    const starredPlayer = await prisma.starred_players.upsert({
      where: {
        starred_players_unique: {
          seasonTeamId: seasonTeam.id,
          playerId: playerId,
          seasonId: seasonId,
        },
      },
      update: {},
      create: {
        seasonTeamId: seasonTeam.id,
        playerId: playerId,
        seasonId: seasonId,
      },
    })

    return NextResponse.json({ success: true, starredPlayer })
  } catch (error) {
    console.error('Error starring player:', error)
    return NextResponse.json({ error: 'Failed to star player' }, { status: 500 })
  }
}

// DELETE - Unstar a player
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.team_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const playerId = searchParams.get('playerId')
    const seasonId = searchParams.get('seasonId')

    if (!playerId || !seasonId) {
      return NextResponse.json({ error: 'Player ID and Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.team_id,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    // Unstar the player
    await prisma.starred_players.deleteMany({
      where: {
        seasonTeamId: seasonTeam.id,
        playerId: playerId,
        seasonId: seasonId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unstarring player:', error)
    return NextResponse.json({ error: 'Failed to unstar player' }, { status: 500 })
  }
}
