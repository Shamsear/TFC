import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

/**
 * POST /api/admin/rounds/[id]/team-bids/[teamId]/toggle-submit - Toggle submission status
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

    // Only allow toggling for active or draft rounds
    if (!['active', 'draft'].includes(round.status)) {
      return NextResponse.json(
        { error: `Cannot toggle submission for round with status: ${round.status}` },
        { status: 400 }
      )
    }

    // Handle based on round type
    if (round.roundType === 'bulk') {
      // Get bulk selection
      const selection = await prisma.bulk_round_selections.findUnique({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        }
      })

      if (!selection) {
        return NextResponse.json(
          { error: 'No selection found for this team' },
          { status: 404 }
        )
      }

      // Toggle submission status
      const newStatus = !selection.submitted
      const now = new Date()

      await prisma.bulk_round_selections.update({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        },
        data: {
          submitted: newStatus,
          submittedAt: newStatus ? now : null
        }
      })

      return NextResponse.json({
        success: true,
        submitted: newStatus,
        message: newStatus 
          ? 'Selection marked as submitted'
          : 'Selection marked as not submitted'
      })
    } else {
      // Normal round - get team bids
      const teamBids = await prisma.team_round_bids.findUnique({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        }
      })

      if (!teamBids) {
        return NextResponse.json(
          { error: 'No bids found for this team' },
          { status: 404 }
        )
      }

      // Toggle submission status
      const newStatus = !teamBids.submitted
      const now = new Date()

      await prisma.team_round_bids.update({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        },
        data: {
          submitted: newStatus,
          submittedAt: newStatus ? now : null
        }
      })

      return NextResponse.json({
        success: true,
        submitted: newStatus,
        message: newStatus 
          ? 'Bids marked as submitted'
          : 'Bids marked as not submitted'
      })
    }
  } catch (error) {
    console.error('Toggle submission error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle submission status' },
      { status: 500 }
    )
  }
}
