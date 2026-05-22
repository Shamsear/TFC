import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * DELETE /api/admin/rounds/[id]/team-bids/[teamId] - Delete team bids for a round
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: roundId, teamId } = await params
    
    // Check authentication
    const session = await auth()
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        roundType: true,
        status: true
      }
    })

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Only allow deletion for active or draft rounds
    if (!['active', 'draft'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot delete bids for round with status: ${round.status}` },
        { status: 400 }
      )
    }

    // Delete based on round type
    if (round.roundType === 'bulk') {
      const deleted = await prisma.bulk_round_selections.deleteMany({
        where: {
          roundId,
          teamId
        }
      })

      if (deleted.count === 0) {
        return NextResponse.json(
          { error: 'No bids found for this team' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Deleted bulk selection for team ${teamId}`,
        deletedCount: deleted.count
      })
    } else {
      const deleted = await prisma.team_round_bids.deleteMany({
        where: {
          roundId,
          teamId
        }
      })

      if (deleted.count === 0) {
        return NextResponse.json(
          { error: 'No bids found for this team' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Deleted bids for team ${teamId}`,
        deletedCount: deleted.count
      })
    }
  } catch (error) {
    console.error('Delete team bids error:', error)
    return NextResponse.json(
      { error: 'Failed to delete team bids' },
      { status: 500 }
    )
  }
}
