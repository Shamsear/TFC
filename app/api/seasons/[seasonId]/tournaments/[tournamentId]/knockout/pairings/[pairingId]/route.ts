import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { ensureMatchesForPairing } from '@/lib/tournament-linking'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string; pairingId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pairingId } = await params
    const body = await request.json()
    const { team1Id, team2Id } = body

    if (!team1Id || !team2Id) {
      return NextResponse.json(
        { error: 'Both teams are required' },
        { status: 400 }
      )
    }

    if (team1Id === team2Id) {
      return NextResponse.json(
        { error: 'Teams must be different' },
        { status: 400 }
      )
    }

    const pairing = await prisma.knockout_pairings.findUnique({
      where: { id: pairingId },
      include: {
        knockoutRound: true
      }
    })

    if (!pairing) {
      return NextResponse.json({ error: 'Pairing not found' }, { status: 404 })
    }

    const matchRefs = await ensureMatchesForPairing(
      prisma,
      { ...pairing, team1Id, team2Id },
      pairing.knockoutRound.roundName,
      pairing.knockoutRound.legs,
      pairing.knockoutRound.tournamentId
    )

    const updatedPairing = await prisma.knockout_pairings.update({
      where: { id: pairingId },
      data: {
        team1Id,
        team2Id,
        leg1MatchId: matchRefs.leg1MatchId,
        leg2MatchId: matchRefs.leg2MatchId
      }
    })

    // Create audit log
    const { seasonId } = await params
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_TOURNAMENT',
      entityType: 'knockout_pairing',
      entityId: pairingId,
      entityName: 'Knockout Pairing',
      seasonId,
      details: {
        pairingId,
        team1Id,
        team2Id
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(updatedPairing)
  } catch (error) {
    console.error('Error updating pairing:', error)
    return NextResponse.json(
      { error: 'Failed to update pairing' },
      { status: 500 }
    )
  }
}
