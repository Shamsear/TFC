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
      // Pass 1: Collect original transfers and mark as SWAPPED_OUT
      const originalTransfers = new Map<string, any>()
      
      for (const swapPlayer of swapRequest.players) {
        // Find the active transfer
        const activeTransfer = await tx.transfer_history.findFirst({
          where: {
            seasonId: swapRequest.seasonId,
            teamId: swapPlayer.fromTeamId,
            basePlayerId: swapPlayer.playerId,
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
        })
        
        if (!activeTransfer) {
          throw new Error(`Active transfer not found for player ${swapPlayer.playerName}`)
        }
        
        originalTransfers.set(swapPlayer.playerId, activeTransfer)
        
        // Mark as SWAPPED_OUT
        await tx.transfer_history.update({
          where: { id: activeTransfer.id },
          data: {
            status: 'SWAPPED_OUT',
            releasedAt: new Date(),
            releaseNotes: `Swapped via admin approval - Request ID: ${id}`,
          },
        })
      }
      
      // Pass 2: Create new transfers swapping the values
      for (const swapPlayer of swapRequest.players) {
        const oldTransfer = originalTransfers.get(swapPlayer.playerId)
        
        // Find counterpart
        const counterpart = swapRequest.players.find(
          p => p.fromTeamId === swapPlayer.toTeamId && p.toTeamId === swapPlayer.fromTeamId
        )
        
        if (!counterpart) {
          throw new Error(`Counterpart not found for player ${swapPlayer.playerName}`)
        }
        
        const counterpartTransfer = originalTransfers.get(counterpart.playerId)
        
        if (!counterpartTransfer) {
          throw new Error(`Counterpart transfer data not found for ${counterpart.playerName}`)
        }
        
        // Create new transfer with counterpart's value
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
