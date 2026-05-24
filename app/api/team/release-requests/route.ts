import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, teamId, releases } = body

    // Verify team ownership
    if (teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify season has release window open
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
    })

    if (!season?.releaseWindowOpen) {
      return NextResponse.json({ error: 'Release window is closed' }, { status: 400 })
    }

    // Get current window timestamp
    const windowOpenedAt = new Date()

    // Create release requests
    const requests = await Promise.all(
      releases.map(async (release: any) => {
        // Verify player belongs to team
        const transfer = await prisma.transfer_history.findFirst({
          where: {
            seasonId,
            teamId,
            basePlayerId: release.playerId,
            status: 'ACTIVE',
          },
        })

        if (!transfer) {
          throw new Error(`Player ${release.playerName} not found in team`)
        }

        // Check if request already exists
        const existing = await prisma.release_requests.findFirst({
          where: {
            seasonId,
            teamId,
            playerId: release.playerId,
            status: 'pending',
          },
        })

        if (existing) {
          throw new Error(`Release request for ${release.playerName} already exists`)
        }

        // Create request
        return prisma.release_requests.create({
          data: {
            id: randomUUID(),
            seasonId,
            teamId,
            playerId: release.playerId,
            playerName: release.playerName,
            refundAmount: release.refundAmount,
            notes: release.notes || null,
            status: 'pending',
            windowOpenedAt,
          },
        })
      })
    )

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error creating release requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create release requests' },
      { status: 500 }
    )
  }
}

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

    // Get all release requests for this team
    const requests = await prisma.release_requests.findMany({
      where: {
        seasonId,
        teamId: session.user.teamId,
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('Error fetching release requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch release requests' },
      { status: 500 }
    )
  }
}
