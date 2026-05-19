import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/tiebreakers/[id]/status - Lightweight poll endpoint for team-side tiebreaker page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tiebreakerId } = await params;

    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        winningTeamId: true,
        winningBid: true,
        teamTiebreakerBids: {
          select: {
            teamId: true,
            submitted: true,
            submittedAt: true
          }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: tiebreaker.status,
      resolved: tiebreaker.status !== 'active',
      winningTeamId: tiebreaker.winningTeamId,
      winningBid: tiebreaker.winningBid,
      teamBids: tiebreaker.teamTiebreakerBids
    });
  } catch (error) {
    console.error('Tiebreaker status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
