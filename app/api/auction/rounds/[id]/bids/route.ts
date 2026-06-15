import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { encryptBids } from '@/lib/auction/encryption';
import { generateBidAuditId } from '@/lib/id-generator';
import { validateBids, BidData } from '@/lib/auction/bid-validator';

/**
 * POST /api/auction/rounds/[id]/bids - Place/update bids (UPSERT)
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

    const { id: roundId } = await params;
    const body = await request.json();
    const { bids, submitted = false } = body;

    // Validate bids array
    if (!Array.isArray(bids)) {
      return NextResponse.json(
        { error: 'Bids must be an array' },
        { status: 400 }
      );
    }

    // Get round details
    const round = await prisma.rounds.findUnique({
      where: { id: roundId },
      select: {
        status: true,
        seasonId: true,
        roundType: true,
        maxBidsPerTeam: true,
        basePrice: true,
        endTime: true
      }
    });

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Check if round is active
    if (round.status !== 'active') {
      return NextResponse.json(
        { error: `Round is not active (status: ${round.status})` },
        { status: 400 }
      );
    }

    // Check if round type is normal
    if (round.roundType !== 'normal') {
      return NextResponse.json(
        { error: 'This endpoint is for normal rounds only. Use /api/team/bulk-rounds for bulk rounds.' },
        { status: 400 }
      );
    }

    // Check if round has expired
    if (round.endTime) {
      const now = new Date();
      const endTime = new Date(round.endTime);
      if (now > endTime) {
        return NextResponse.json(
          { error: 'Round has expired' },
          { status: 400 }
        );
      }
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

    // Check if this is an edit (bids already exist) or new submission
    const existingBids = await prisma.team_round_bids.findUnique({
      where: {
        roundId_teamId: {
          roundId,
          teamId
        }
      },
      select: {
        id: true,
        submitted: true
      }
    });

    const isEdit = !!existingBids;

    // Get current squad size (only ACTIVE players)
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId,
        seasonId: round.seasonId,
        status: 'ACTIVE'
      }
    });

    // Validate bids
    // For edits, skip balance/reserve validation since balance may have changed due to parallel rounds
    const validation = await validateBids(bids as BidData[], {
      roundId,
      teamId,
      seasonId: round.seasonId,
      maxBidsPerTeam: round.maxBidsPerTeam || undefined,
      basePrice: round.basePrice || undefined,
      currentBudget: seasonTeam.currentBudget,
      skipBalanceCheck: isEdit // Skip balance validation for edits
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Prepare bid data for encryption
    const bidData = {
      bids: bids.map((bid: BidData) => ({
        base_player_id: bid.base_player_id,
        player_name: bid.player_name,
        amount: bid.amount,
        timestamp: new Date().toISOString()
      })),
      version: 1,
      last_modified: new Date().toISOString()
    };

    // Encrypt bids
    const encryptedBids = encryptBids(JSON.stringify(bidData));

    // UPSERT team_round_bids within a transaction to prevent race condition with finalization
    const teamRoundBid = await prisma.$transaction(async (tx) => {
      // Re-verify round status inside transaction
      const currentRound = await tx.rounds.findUnique({
        where: { id: roundId },
        select: { status: true }
      });
      
      if (currentRound?.status !== 'active') {
        throw new Error(`Round is no longer active (status: ${currentRound?.status})`);
      }

      return await tx.team_round_bids.upsert({
        where: {
          roundId_teamId: {
            roundId,
            teamId
          }
        },
        create: {
          id: `${roundId}_${teamId}`,
          roundId,
          teamId,
          encryptedBids,
          submitted,
          bidCount: bids.length,
          lastUpdated: new Date(),
          submittedAt: submitted ? new Date() : null
        },
        update: {
          encryptedBids,
          submitted,
          bidCount: bids.length,
          lastUpdated: new Date(),
          submittedAt: submitted ? new Date() : null
        }
      });
    });

    // Optional: Create audit log entry
    try {
      const auditId = await generateBidAuditId();
      await prisma.bid_audit_log.create({
        data: {
          id: auditId,
          roundId,
          teamId,
          action: teamRoundBid ? 'update' : 'create',
          encryptedBids,
          timestamp: new Date()
        }
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the request if audit log fails
    }

    return NextResponse.json({
      success: true,
      bidCount: bids.length,
      submitted,
      lastUpdated: teamRoundBid.lastUpdated,
      message: submitted ? 'Bids submitted successfully' : 'Bids saved as draft'
    });
  } catch (error) {
    console.error('Place bids error:', error);
    return NextResponse.json(
      { error: 'Failed to save bids' },
      { status: 500 }
    );
  }
}
