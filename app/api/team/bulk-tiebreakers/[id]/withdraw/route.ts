import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { withdrawFromBulkTiebreaker } from '@/lib/auction/finalize-bulk-tiebreaker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/team/bulk-tiebreakers/[id]/withdraw - Withdraw from bulk tiebreaker
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    const { id } = await params;
    const tiebreakerId = parseInt(id);
    if (isNaN(tiebreakerId)) {
      return NextResponse.json({ error: 'Invalid tiebreaker ID' }, { status: 400 });
    }

    // Withdraw using utility function
    const result = await withdrawFromBulkTiebreaker(tiebreakerId, teamId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to withdraw' },
        { status: 400 }
      );
    }

    // Fetch the updated tiebreaker details to return immediately, matching GET route structure
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        id: true,
        roundId: true,
        basePlayerId: true,
        basePrice: true,
        status: true,
        currentHighestBid: true,
        currentHighestTeamId: true,
        teamsRemaining: true,
        startTime: true,
        maxEndTime: true,
        createdAt: true,
        basePlayer: {
          select: {
            name: true,
            photoUrl: true
          }
        },
        participants: {
          select: {
            teamId: true,
            status: true,
            currentBid: true,
            lastBidTime: true
          }
        },
        bidHistory: {
          orderBy: {
            bidTime: 'desc'
          },
          take: 20,
          select: {
            id: true,
            teamId: true,
            bidAmount: true,
            bidTime: true
          }
        }
      }
    });

    const myParticipation = tiebreaker?.participants.find(p => p.teamId === teamId);

    return NextResponse.json({
      success: true,
      message: 'Withdrawn from tiebreaker successfully',
      tiebreaker,
      myParticipation: myParticipation || null
    });
  } catch (error) {
    console.error('Withdraw from bulk tiebreaker error:', error);
    return NextResponse.json(
      { error: 'Failed to withdraw' },
      { status: 500 }
    );
  }
}
