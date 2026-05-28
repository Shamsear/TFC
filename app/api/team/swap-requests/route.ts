import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, swapWindowId, requestingTeamId, targetTeamId, players } = body

    // Verify team ownership
    if (requestingTeamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify season has an active swap window
    const activeSwapWindow = await prisma.swap_windows.findFirst({
      where: {
        seasonId,
        status: 'ACTIVE',
      }
    })

    if (!activeSwapWindow) {
      return NextResponse.json({ error: 'Swap window is closed' }, { status: 400 })
    }

    const maxSwaps = activeSwapWindow.swapLimit || 5

    // Validate even swap
    const playersFromRequesting = players.filter((p: any) => p.fromTeamId === requestingTeamId)
    const playersFromTarget = players.filter((p: any) => p.fromTeamId === targetTeamId)

    if (playersFromRequesting.length !== playersFromTarget.length) {
      return NextResponse.json({ error: 'Must be an even swap' }, { status: 400 })
    }

    if (playersFromRequesting.length === 0) {
      return NextResponse.json({ error: 'Must select at least one player from each team' }, { status: 400 })
    }

    // Verify all players belong to correct teams and are ACTIVE
    for (const player of players) {
      const transfer = await prisma.transfer_history.findFirst({
        where: {
          seasonId,
          teamId: player.fromTeamId,
          basePlayerId: player.playerId,
          status: 'ACTIVE',
        },
      })

      if (!transfer) {
        return NextResponse.json(
          { error: `Player ${player.playerName} not found in team or not active` },
          { status: 400 }
        )
      }
    }

    // Check request limit (max swaps requests involved in - sent or received for this window)
    const teamRequests = await prisma.swap_requests.count({
      where: {
        seasonId,
        swapWindowId: activeSwapWindow.id,
        status: { in: ['pending', 'approved'] },
        OR: [
          { requestingTeamId },
          { targetTeamId: requestingTeamId },
        ],
      }
    })

    if (teamRequests >= maxSwaps) {
      return NextResponse.json({ error: `You have reached the maximum limit of ${maxSwaps} active/completed swap requests per window` }, { status: 400 })
    }

    // Check completed swap limit for requesting team (max swaps for this window)
    const approvedSwaps = await prisma.swap_requests.count({
      where: {
        seasonId,
        swapWindowId: activeSwapWindow.id,
        status: 'approved',
        OR: [
          { requestingTeamId },
          { targetTeamId: requestingTeamId },
        ],
      }
    })

    if (approvedSwaps >= maxSwaps) {
      return NextResponse.json({ error: `You have reached the maximum limit of ${maxSwaps} completed swaps per window` }, { status: 400 })
    }

    // Check target team request limit for this window
    const targetTeamRequests = await prisma.swap_requests.count({
      where: {
        seasonId,
        swapWindowId: activeSwapWindow.id,
        status: { in: ['pending', 'approved'] },
        OR: [
          { requestingTeamId: targetTeamId },
          { targetTeamId },
        ],
      }
    })

    if (targetTeamRequests >= maxSwaps) {
      return NextResponse.json({ error: `The target team has already reached their maximum limit of ${maxSwaps} active/completed swap requests per window` }, { status: 400 })
    }

    // Check completed swap limit for target team (max approved swaps for this window)
    const targetApprovedSwaps = await prisma.swap_requests.count({
      where: {
        seasonId,
        swapWindowId: activeSwapWindow.id,
        status: 'approved',
        OR: [
          { requestingTeamId: targetTeamId },
          { targetTeamId },
        ],
      }
    })

    if (targetApprovedSwaps >= maxSwaps) {
      return NextResponse.json({ error: `The target team has already reached their maximum limit of ${maxSwaps} completed swaps per window` }, { status: 400 })
    }

    // Allow multiple pending swap requests between the same teams

    // Create swap request with players
    const windowOpenedAt = new Date()
    const swapRequestId = randomUUID()

    const swapRequest = await prisma.swap_requests.create({
      data: {
        id: swapRequestId,
        seasonId,
        swapWindowId: activeSwapWindow.id,
        requestingTeamId,
        targetTeamId,
        status: 'pending',
        windowOpenedAt,
        players: {
          create: players.map((p: any) => ({
            id: randomUUID(),
            playerId: p.playerId,
            playerName: p.playerName,
            fromTeamId: p.fromTeamId,
            toTeamId: p.toTeamId,
            playerValue: p.playerValue,
          })),
        },
      },
      include: {
        requestingTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        targetTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        players: {
          include: {
            basePlayer: {
              select: {
                id: true,
                name: true,
                player_id: true,
              },
            },
            fromTeam: {
              select: {
                id: true,
                name: true,
              },
            },
            toTeam: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // Transform for response
    const transformedRequest = {
      id: swapRequest.id,
      requestingTeamId: swapRequest.requestingTeamId,
      requestingTeamName: swapRequest.requestingTeam.name,
      targetTeamId: swapRequest.targetTeamId,
      targetTeamName: swapRequest.targetTeam.name,
      isMyRequest: true,
      submittedAt: swapRequest.submittedAt ? swapRequest.submittedAt.toISOString() : '',
      players: swapRequest.players.map(p => ({
        id: p.id,
        playerId: p.playerId,
        playerName: p.playerName,
        playerPhotoId: p.basePlayer.player_id || p.basePlayer.id,
        fromTeamId: p.fromTeamId,
        fromTeamName: p.fromTeam.name,
        toTeamId: p.toTeamId,
        toTeamName: p.toTeam.name,
        playerValue: p.playerValue,
      })),
    }

    // Notify the target team that a swap request has been sent to them
    try {
      const targetTeamData = await prisma.teams.findUnique({
        where: { id: targetTeamId },
        select: { name: true }
      });
      const targetManagerId = await getTeamManagerId(targetTeamId);
      const requestingTeamData = await prisma.teams.findUnique({
        where: { id: requestingTeamId },
        select: { name: true }
      });
      if (targetManagerId) {
        await sendPushNotificationRaw(targetManagerId, {
          title: '📨 New Swap Request!',
          body: `${requestingTeamData?.name || 'A team'} wants to swap players with you. Review it now.`,
          url: '/team/swap-request'
        }, 'trades').catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[Push] Swap request notification failed (non-fatal):', notifErr);
    }

    // Notify Admins
    try {
      await notifyAllAdmins({
        title: '🔄 New Swap Request',
        body: `A new swap request has been raised between teams.`,
        url: `/sub-admin/${seasonId}/tools/swap-requests`
      }, seasonId);
    } catch (notifErr) {
      console.warn('[Push] Admin swap request notification failed:', notifErr);
    }

    return NextResponse.json({ success: true, request: transformedRequest })
  } catch (error: any) {
    console.error('Error creating swap request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create swap request' },
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

    // Get all swap requests involving this team
    const requests = await prisma.swap_requests.findMany({
      where: {
        seasonId,
        OR: [
          { requestingTeamId: session.user.teamId },
          { targetTeamId: session.user.teamId },
        ],
      },
      include: {
        requestingTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        targetTeam: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        players: {
          include: {
            basePlayer: {
              select: {
                id: true,
                name: true,
                player_id: true,
              },
            },
            fromTeam: {
              select: {
                id: true,
                name: true,
              },
            },
            toTeam: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    console.error('Error fetching swap requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch swap requests' },
      { status: 500 }
    )
  }
}
