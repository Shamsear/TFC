import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * POST /api/admin/rounds/[id]/team-bids/[teamId]/unsubmit - Unsubmit team bids
 */
export async function POST(
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

    // Only allow unsubmit for active or draft rounds
    if (!['active', 'draft'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot unsubmit bids for round with status: ${round.status}` },
        { status: 400 }
      )
    }

    // Handle based on round type
    if (round.roundType === 'bulk') {
      const updated = await prisma.bulk_round_selections.updateMany({
        where: {
          roundId,
          teamId,
          submitted: true
        },
        data: {
          submitted: false,
          submittedAt: null
        }
      })

      if (updated.count === 0) {
        return NextResponse.json(
          { error: 'No submitted selection found for this team' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Team can now edit and resubmit their selection`
      })
    } else {
      const updated = await prisma.team_round_bids.updateMany({
        where: {
          roundId,
          teamId,
          submitted: true
        },
        data: {
          submitted: false,
          submittedAt: null
        }
      })

      if (updated.count === 0) {
        return NextResponse.json(
          { error: 'No submitted bids found for this team' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `Team can now edit and resubmit their bids`
      })
    }
  } catch (error) {
    console.error('Unsubmit team bids error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubmit team bids' },
      { status: 500 }
    )
  }
}
