import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the swap request with all players
    const swapRequest = await prisma.swap_requests.findUnique({
      where: { id },
      include: {
        players: true,
        requestingTeam: true,
        targetTeam: true,
        season: true,
      },
    })

    if (!swapRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (swapRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Validate even swap
    const playersFromRequesting = swapRequest.players.filter(p => p.fromTeamId === swapRequest.requestingTeamId)
    const playersFromTarget = swapRequest.players.filter(p => p.fromTeamId === swapRequest.targetTeamId)

    if (playersFromRequesting.length !== playersFromTarget.length) {
      return NextResponse.json({ error: 'Invalid swap: uneven player count' }, { status: 400 })
    }

    // Perform the swap in a transaction
    await prisma.$transaction(async (tx) => {
      // For each player in the swap
      for (const swapPlayer of swapRequest.players) {
        // 1. Mark old transfer as SWAPPED_OUT
        await tx.transfer_history.updateMany({
          where: {
            seasonId: swapRequest.seasonId,
            teamId: swapPlayer.fromTeamId,
            basePlayerId: swapPlayer.playerId,
            status: 'ACTIVE',
          },
          data: {
            status: 'SWAPPED_OUT',
            releasedAt: new Date(),
            releaseNotes: `Swapped via admin approval - Request ID: ${id}`,
          },
        })

        // 2. Get the player's current value (from the transfer we just marked)
        const oldTransfer = await tx.transfer_history.findFirst({
          where: {
            seasonId: swapRequest.seasonId,
            teamId: swapPlayer.fromTeamId,
            basePlayerId: swapPlayer.playerId,
            status: 'SWAPPED_OUT',
          },
          orderBy: { createdAt: 'desc' },
        })

        if (!oldTransfer) {
          throw new Error(`Transfer not found for player ${swapPlayer.playerName}`)
        }

        // 3. Find the counterpart player (who's coming to this team)
        const counterpart = swapRequest.players.find(
          p => p.fromTeamId === swapPlayer.toTeamId && p.toTeamId === swapPlayer.fromTeamId
        )

        if (!counterpart) {
          throw new Error(`Counterpart not found for player ${swapPlayer.playerName}`)
        }

        // Get counterpart's value
        const counterpartTransfer = await tx.transfer_history.findFirst({
          where: {
            seasonId: swapRequest.seasonId,
            teamId: counterpart.fromTeamId,
            basePlayerId: counterpart.playerId,
            status: 'SWAPPED_OUT',
          },
          orderBy: { createdAt: 'desc' },
        })

        if (!counterpartTransfer) {
          throw new Error(`Counterpart transfer not found for ${counterpart.playerName}`)
        }

        // 4. Create new transfer with counterpart's value
        // Player gets the value of who they're being swapped for
        await tx.transfer_history.create({
          data: {
            id: `swap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            seasonId: swapRequest.seasonId,
            teamId: swapPlayer.toTeamId,
            basePlayerId: swapPlayer.playerId,
            soldPrice: counterpartTransfer.soldPrice, // Takes counterpart's value
            roundId: oldTransfer.roundId,
            status: 'ACTIVE',
            createdAt: new Date(),
          },
        })
      }

      // 5. Update request status
      await tx.swap_requests.update({
        where: { id },
        data: {
          status: 'approved',
          processedAt: new Date(),
          processedBy: session.user.id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error approving swap request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve swap request' },
      { status: 500 }
    )
  }
}
