import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * GET /api/tiebreakers/[id] - Get tiebreaker info
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

    const { id: tiebreakerId } = await params;

    // Get tiebreaker details
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        id: true,
        roundId: true,
        basePlayerId: true,
        originalAmount: true,
        tiedTeamsCount: true,
        status: true,
        winningTeamId: true,
        winningBid: true,
        createdAt: true,
        basePlayer: {
          select: {
            name: true,
            photoUrl: true
          }
        },
        round: {
          select: {
            roundNumber: true,
            position: true,
            seasonId: true,
            season: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    // Get team's bid entry
    const teamBid = await prisma.team_tiebreaker_bids.findUnique({
      where: {
        tiebreakerId_teamId: {
          tiebreakerId,
          teamId
        }
      },
      select: {
        oldBidAmount: true,
        newBidAmount: true,
        submitted: true,
        submittedAt: true
      }
    });

    if (!teamBid) {
      return NextResponse.json(
        { error: 'Team is not part of this tiebreaker' },
        { status: 400 }
      );
    }

    // Get team budget
    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: tiebreaker.round.seasonId,
          teamId
        }
      },
      select: {
        currentBudget: true
      }
    });

    return NextResponse.json({
      success: true,
      tiebreaker,
      myBid: teamBid,
      budget: seasonTeam?.currentBudget || 0
    });
  } catch (error) {
    console.error('Get tiebreaker info error:', error);
    return NextResponse.json(
      { error: 'Failed to get tiebreaker info' },
      { status: 500 }
    );
  }
}
