import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { decryptBids } from '@/lib/auction/encryption';

/**
 * GET /api/auction/rounds/[id]/my-bids - Get team's bids for a round
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TEAM_MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teamId = session.user.teamId;
    if (!teamId) {
      return NextResponse.json({ error: 'Team not found' }, { status: 400 });
    }

    const roundId = params.id;

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
        seasonId: true
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
      }
    });

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in this season' },
        { status: 400 }
      );
    }

    // Get team's bids
    const teamRoundBid = await prisma.team_round_bids.findUnique({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      },
      select: {
        encryptedBids: true,
        submitted: true,
        bidCount: true,
        lastUpdated: true,
        submittedAt: true
      }
    });

    if (!teamRoundBid) {
      return NextResponse.json({
        success: true,
        bids: [],
        submitted: false,
        bidCount: 0,
        round
      });
    }

    // Decrypt bids
    let bids = [];
    try {
      const decrypted = decryptBids(teamRoundBid.encryptedBids);
      const parsed = JSON.parse(decrypted);
      bids = parsed.bids || [];
    } catch (error) {
      console.error('Failed to decrypt bids:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt bids' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bids,
      submitted: teamRoundBid.submitted,
      bidCount: teamRoundBid.bidCount,
      lastUpdated: teamRoundBid.lastUpdated,
      submittedAt: teamRoundBid.submittedAt,
      round
    });
  } catch (error) {
    console.error('Get my bids error:', error);
    return NextResponse.json(
      { error: 'Failed to get bids' },
      { status: 500 }
    );
  }
}
