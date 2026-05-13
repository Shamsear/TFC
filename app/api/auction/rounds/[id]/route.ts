import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkAndFinalizeExpiredRound } from '@/lib/auction/lazy-finalize-round';
import { calculateReserve } from '@/lib/auction/reserve-calculator-v2';

/**
 * GET /api/auction/rounds/[id] - Get round info (with lazy finalization)
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

    const { id: roundId } = await params;

    // Lazy finalization check
    await checkAndFinalizeExpiredRound(roundId);

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        id: true,
        roundNumber: true,
        position: true,
        roundType: true,
        status: true,
        startTime: true,
        endTime: true,
        maxBidsPerTeam: true,
        basePrice: true,
        durationSeconds: true,
        seasonId: true,
        season: {
          select: {
            name: true,
            seasonNumber: true
          }
        }
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if team belongs to season
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId
        }
      },
      select: {
        currentBudget: true
      }
    });

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in this season' },
        { status: 400 }
      );
    }

    // Get squad size
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId,
        seasonId: round.seasonId
      }
    });

    // Calculate budget reserves using v2
    const reserveInfo = await calculateReserve(teamId, roundId, round.seasonId);

    // Calculate time remaining
    let timeRemaining = null;
    if (round.endTime && round.status === 'active') {
      const now = new Date();
      const endTime = new Date(round.endTime);
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

    // Get team's bid status
    const teamBid = await prisma.team_round_bids.findUnique({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      },
      select: {
        submitted: true,
        bidCount: true,
        lastUpdated: true
      }
    });

    return NextResponse.json({
      success: true,
      round,
      budget: {
        total: seasonTeam.currentBudget,
        reserved: reserveInfo.reserve,
        available: reserveInfo.maxBid,
        phase: reserveInfo.phase,
        calculation: reserveInfo.calculation
      },
      squadSize,
      timeRemaining,
      myBidStatus: teamBid ? {
        submitted: teamBid.submitted,
        bidCount: teamBid.bidCount,
        lastUpdated: teamBid.lastUpdated
      } : null
    });
  } catch (error) {
    console.error('Get round info error:', error);
    return NextResponse.json(
      { error: 'Failed to get round info' },
      { status: 500 }
    );
  }
}
