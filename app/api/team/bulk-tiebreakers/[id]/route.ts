import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/team/bulk-tiebreakers/[id] - Get bulk tiebreaker info
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

    // Get tiebreaker details
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

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    // Get team's participation status
    const myParticipation = tiebreaker.participants.find(p => p.teamId === teamId);

    if (!myParticipation) {
      return NextResponse.json(
        { error: 'Team is not part of this tiebreaker' },
        { status: 400 }
      );
    }

    // Calculate time remaining
    let timeRemaining = null;
    if (tiebreaker.maxEndTime && tiebreaker.status === 'active') {
      const now = new Date();
      const endTime = new Date(tiebreaker.maxEndTime);
      const diffMs = endTime.getTime() - now.getTime();
      
      if (diffMs > 0) {
        timeRemaining = {
          milliseconds: diffMs,
          seconds: Math.floor(diffMs / 1000),
          minutes: Math.floor(diffMs / (1000 * 60)),
          hours: Math.floor(diffMs / (1000 * 60 * 60))
        };
      }
    }

    return NextResponse.json({
      success: true,
      tiebreaker: {
        ...tiebreaker,
        timeRemaining
      },
      myParticipation
    });
  } catch (error) {
    console.error('Get bulk tiebreaker info error:', error);
    return NextResponse.json(
      { error: 'Failed to get tiebreaker info' },
      { status: 500 }
    );
  }
}
