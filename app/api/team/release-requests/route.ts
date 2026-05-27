import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications-server'
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

    // Verify there is an active release window
    const activeWindow = await prisma.release_windows.findFirst({
      where: { 
        seasonId,
        status: 'ACTIVE'
      }
    })

    if (!activeWindow) {
      return NextResponse.json({ error: 'No active release window found' }, { status: 400 })
    }

    const MAX_RELEASES_PER_TEAM = 3

    // Check total release requests (all statuses)
    const totalRequestsCount = await prisma.release_requests.count({
      where: {
        seasonId,
        teamId,
      },
    })

    // Check if adding these releases would exceed the total request limit
    if (totalRequestsCount + releases.length > MAX_RELEASES_PER_TEAM) {
      const remaining = MAX_RELEASES_PER_TEAM - totalRequestsCount
      return NextResponse.json(
        { 
          error: `You can only submit ${MAX_RELEASES_PER_TEAM} release requests per season. You have ${remaining} request${remaining !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      )
    }

    // Also check approved releases count
    const approvedReleasesCount = await prisma.release_requests.count({
      where: {
        seasonId,
        teamId,
        status: 'approved',
      },
    })

    // Check if adding these releases would exceed the approved limit
    if (approvedReleasesCount + releases.length > MAX_RELEASES_PER_TEAM) {
      const remaining = MAX_RELEASES_PER_TEAM - approvedReleasesCount
      return NextResponse.json(
        { 
          error: `You can only have ${MAX_RELEASES_PER_TEAM} approved releases per season. You have ${remaining} approval${remaining !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      )
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
            releaseWindowId: activeWindow.id
          },
        })
      })
    )

    // Notify Admins
    try {
      const teamData = await prisma.teams.findUnique({ where: { id: teamId }, select: { name: true } });
      await notifyAllAdmins({
        title: '📋 New Release Request',
        body: `${teamData?.name || 'A team'} has requested to release ${requests.length} player(s).`,
        url: `/sub-admin/${seasonId}/tools/release-requests`
      });
    } catch (notifErr) {
      console.warn('[Push] Admin release request notification failed:', notifErr);
    }

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

    // Count total requests (all statuses)
    const totalRequestsCount = requests.length

    // Count approved releases
    const approvedCount = await prisma.release_requests.count({
      where: {
        seasonId,
        teamId: session.user.teamId,
        status: 'approved',
      },
    })

    return NextResponse.json({ 
      requests,
      totalRequestsCount,
      approvedCount,
      maxReleases: 3,
      remainingRequests: 3 - totalRequestsCount,
      remainingApprovals: 3 - approvedCount,
    })
  } catch (error: any) {
    console.error('Error fetching release requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch release requests' },
      { status: 500 }
    )
  }
}
