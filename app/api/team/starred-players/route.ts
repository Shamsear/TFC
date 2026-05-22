import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get all starred players for a team in a season
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    console.log('[Starred Players GET] Session teamId:', session.user.teamId)
    console.log('[Starred Players GET] Season ID:', seasonId)

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      console.log('[Starred Players GET] ERROR: Team not found in season')
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    console.log('[Starred Players GET] Season team ID:', seasonTeam.id)
    console.log('[Starred Players GET] Querying starred_players WHERE seasonTeamId =', seasonTeam.id, 'AND seasonId =', seasonId)

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

    console.log('[Starred Players GET] Found', starredPlayers.length, 'starred players')
    console.log('[Starred Players GET] First 5 player IDs:', starredPlayers.slice(0, 5).map(p => p.playerId))

    return NextResponse.json({
      starredPlayerIds: starredPlayers.map(sp => sp.playerId),
    })
  } catch (error) {
    console.error('Error fetching starred players:', error)
    return NextResponse.json({ error: 'Failed to fetch starred players' }, { status: 500 })
  }
}

// POST - Star a player or players
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playerId, playerIds, seasonId } = body

    if ((!playerId && (!playerIds || !playerIds.length)) || !seasonId) {
      return NextResponse.json({ error: 'Player ID(s) and Season ID required' }, { status: 400 })
    }

    // Get the season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    console.log('[Starred Players POST] Session teamId:', session.user.teamId)
    console.log('[Starred Players POST] Season team ID:', seasonTeam.id)
    console.log('[Starred Players POST] Season ID:', seasonId)

    const idsToStar = playerIds || [playerId]
    console.log('[Starred Players POST] Starring player IDs:', idsToStar)

    // Star the players (upsert to handle duplicates)
    // Run in a transaction for bulk operations
    const results = await prisma.$transaction(
      idsToStar.map((id: string) => 
        prisma.starred_players.upsert({
          where: {
            starred_players_unique: {
              seasonTeamId: seasonTeam.id,
              playerId: id,
              seasonId: seasonId,
            },
          },
          update: {},
          create: {
            seasonTeamId: seasonTeam.id,
            playerId: id,
            seasonId: seasonId,
          },
        })
      )
    )

    console.log('[Starred Players POST] Starred', results.length, 'players')

    return NextResponse.json({ success: true, count: results.length })
  } catch (error) {
    console.error('Error starring player(s):', error)
    return NextResponse.json({ error: 'Failed to star player(s)' }, { status: 500 })
  }
}

// DELETE - Unstar a player
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
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
        teamId: session.user.teamId,
        seasonId: seasonId,
      },
    })

    if (!seasonTeam) {
      return NextResponse.json({ error: 'Team not found in season' }, { status: 404 })
    }

    console.log('[Starred Players DELETE] Session teamId:', session.user.teamId)
    console.log('[Starred Players DELETE] Season team ID:', seasonTeam.id)
    console.log('[Starred Players DELETE] Unstarring player ID:', playerId)

    // Unstar the player
    await prisma.starred_players.deleteMany({
      where: {
        seasonTeamId: seasonTeam.id,
        playerId: playerId,
        seasonId: seasonId,
      },
    })

    console.log('[Starred Players DELETE] Successfully unstarred player')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unstarring player:', error)
    return NextResponse.json({ error: 'Failed to unstar player' }, { status: 500 })
  }
}
