import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/team/bulk-tiebreakers/[id]/status - Poll tiebreaker status and submission progress
 * Used for sealed bid model to check if all teams have submitted
 */
export async function GET(
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

    // Get tiebreaker status and submission progress
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        id: true,
        status: true,
        currentHighestBid: true,
        currentHighestTeamId: true,
        participants: {
          select: {
            teamId: true,
            status: true,
            submitted: true,
            submittedAt: true
          }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    // Check if team is participant
    const myParticipation = tiebreaker.participants.find(p => p.teamId === teamId);
    if (!myParticipation) {
      return NextResponse.json(
        { error: 'Team is not part of this tiebreaker' },
        { status: 400 }
      );
    }

    // Count submissions
    const activeParticipants = tiebreaker.participants.filter(p => p.status === 'active');
    const submittedCount = activeParticipants.filter(p => p.submitted).length;
    const totalCount = activeParticipants.length;

    return NextResponse.json({
      success: true,
      status: tiebreaker.status,
      submissionProgress: {
        submitted: submittedCount,
        total: totalCount,
        allSubmitted: submittedCount === totalCount
      },
      participants: tiebreaker.participants.map(p => ({
        teamId: p.teamId,
        status: p.status,
        submitted: p.submitted,
        submittedAt: p.submittedAt
      })),
      // Only reveal winner info if completed
      winner: tiebreaker.status === 'completed' ? {
        teamId: tiebreaker.currentHighestTeamId,
        bidAmount: tiebreaker.currentHighestBid
      } : null
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Get bulk tiebreaker status error:', error);
    return NextResponse.json(
      { error: 'Failed to get tiebreaker status' },
      { status: 500 }
    );
  }
}
