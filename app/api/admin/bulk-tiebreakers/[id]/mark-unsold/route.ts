import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAuditId } from '@/lib/id-generator'

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
    const tiebreakerId = parseInt(id)

    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ error: 'Invalid tiebreaker ID' }, { status: 400 })
    }

    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        basePlayer: true,
        round: {
          include: {
            season: true
          }
        }
      }
    })

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 })
    }

    if (tiebreaker.status === 'completed') {
      return NextResponse.json({ error: 'Tiebreaker already completed' }, { status: 400 })
    }

    // Update tiebreaker status to COMPLETED with no winner
    await prisma.$transaction(async (tx) => {
      // Update tiebreaker status
      await tx.bulk_tiebreakers.update({
        where: { id: tiebreakerId },
        data: {
          status: 'completed',
          currentHighestTeamId: null,
          currentHighestBid: null
        }
      })

      // Create audit log
      const auditId = await generateAuditId()
      await tx.audit_logs.create({
        data: {
          id: auditId,
          userId: session.user.id,
          userEmail: session.user.email || 'unknown',
          userRole: session.user.role,
          action: 'BULK_TIEBREAKER_MARK_UNSOLD',
          entityType: 'bulk_tiebreaker',
          entityId: tiebreakerId.toString(),
          seasonId: tiebreaker.round.seasonId,
          details: JSON.stringify({
            tiebreakerId,
            playerId: tiebreaker.basePlayer.id,
            playerName: tiebreaker.basePlayer.name,
            roundId: tiebreaker.roundId,
            markedBy: session.user.email
          })
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Tiebreaker marked as unsold'
    })
  } catch (error) {
    console.error('Error marking tiebreaker as unsold:', error)
    return NextResponse.json(
      { error: 'Failed to mark tiebreaker as unsold' },
      { status: 500 }
    )
  }
}
