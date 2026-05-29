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

    // Return with strict no-cache headers to prevent stale data
    return NextResponse.json(
      {
        starredPlayerIds: starredPlayers.map(sp => sp.playerId),
        teamId: session.user.teamId, // Include teamId for verification
        seasonTeamId: seasonTeam.id,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
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

    const idsToStar = playerIds || [playerId]

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
