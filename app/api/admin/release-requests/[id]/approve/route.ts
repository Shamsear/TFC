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

    // Get the request
    const releaseRequest = await prisma.release_requests.findUnique({
      where: { id },
      include: {
        team: true,
        season: true,
      },
    })

    if (!releaseRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (releaseRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Perform the release in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update transfer_history status to RELEASED
      await tx.transfer_history.updateMany({
        where: {
          seasonId: releaseRequest.seasonId,
          teamId: releaseRequest.teamId,
          basePlayerId: releaseRequest.playerId,
          status: 'ACTIVE',
        },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
          releaseNotes: `Released via admin approval - Request ID: ${id}`,
        },
      })

      // 2. Refund the team
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: releaseRequest.seasonId,
            teamId: releaseRequest.teamId,
          },
        },
      })

      if (!seasonTeam) {
        throw new Error('Season team not found')
      }

      const newBalance = seasonTeam.currentBudget + releaseRequest.refundAmount

      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: { currentBudget: newBalance },
      })

      // 3. Create ledger entry
      await tx.financial_ledger.create({
        data: {
          id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          seasonTeamId: seasonTeam.id,
          seasonId: releaseRequest.seasonId,
          transactionType: 'REFUND',
          amount: releaseRequest.refundAmount,
          previousBalance: seasonTeam.currentBudget,
          newBalance,
          description: `Player release refund: ${releaseRequest.playerName}`,
          playerName: releaseRequest.playerName,
        },
      })

      // 4. Update request status
      await tx.release_requests.update({
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
    console.error('Error approving release request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve release request' },
      { status: 500 }
    )
  }
}
