import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateReserve } from '@/lib/auction/reserve-calculator';
import { checkTiebreakerComplete, resolveTiebreaker, resumeFinalizationAfterTiebreaker } from '@/lib/auction/tiebreaker';

/**
 * POST /api/tiebreakers/[id]/bid - Submit tiebreaker bid
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

    const { id: tiebreakerId } = await params;
    const body = await request.json();
    const { newBidAmount } = body;

    // Validate bid amount
    if (typeof newBidAmount !== 'number' || newBidAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid bid amount' },
        { status: 400 }
      );
    }

    // Get tiebreaker details
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        originalAmount: true,
        roundId: true,
        round: {
          select: {
            seasonId: true
          }
        }
      }
    });

    if (!tiebreaker) {
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    // Check if tiebreaker is active
    if (tiebreaker.status !== 'active') {
      return NextResponse.json(
        { error: `Tiebreaker is not active (status: ${tiebreaker.status})` },
        { status: 400 }
      );
    }

    // Check if bid is higher than original
    if (newBidAmount <= tiebreaker.originalAmount) {
      return NextResponse.json(
        { error: `Bid must be higher than original amount (${tiebreaker.originalAmount})` },
        { status: 400 }
      );
    }

    // Get team's tiebreaker bid entry
    const teamTiebreakerBid = await prisma.team_tiebreaker_bids.findUnique({
      where: {
        tiebreakerId_teamId: {
          tiebreakerId,
          teamId
        }
      }
    });

    if (!teamTiebreakerBid) {
      return NextResponse.json(
        { error: 'Team is not part of this tiebreaker' },
        { status: 400 }
      );
    }

    // Check if already submitted
    if (teamTiebreakerBid.submitted) {
      return NextResponse.json(
        { error: 'Bid already submitted' },
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

    if (!seasonTeam) {
      return NextResponse.json(
        { error: 'Team not found in season' },
        { status: 400 }
      );
    }

    // Get squad size
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId,
        seasonId: tiebreaker.round.seasonId
      }
    });

    // Check budget with reserves
    const minPlayerPrice = 10; // Minimum bid amount
    const reserve = calculateReserve(seasonTeam.currentBudget, squadSize, 16, minPlayerPrice);
    if (newBidAmount > reserve.availableBudget) {
      return NextResponse.json(
        { error: `Insufficient budget. Available: £${reserve.availableBudget.toLocaleString()}` },
        { status: 400 }
      );
    }

    // Update tiebreaker bid
    await prisma.team_tiebreaker_bids.update({
      where: {
        tiebreakerId_teamId: {
          tiebreakerId,
          teamId
        }
      },
      data: {
        newBidAmount,
        submitted: true,
        submittedAt: new Date()
      }
    });

    // Check if all teams have submitted
    const allSubmitted = await checkTiebreakerComplete(tiebreakerId);

    if (allSubmitted) {
      console.log(`\n🎯 All teams submitted for tiebreaker ${tiebreakerId} - auto-resolving...`);
      
      // Resolve tiebreaker
      const resolveResult = await resolveTiebreaker(tiebreakerId);

      if (resolveResult.success && resolveResult.winnerId && resolveResult.winningBid) {
        console.log(`   ✓ Tiebreaker resolved - Winner: Team ${resolveResult.winnerId}`);
        
        // Auto-resume finalization
        const resumeResult = await resumeFinalizationAfterTiebreaker(tiebreakerId);

        if (resumeResult.success) {
          if (resumeResult.finalizationComplete) {
            console.log('   ✅ Round finalization COMPLETE\n');
            return NextResponse.json({
              success: true,
              newBidAmount,
              message: 'Tiebreaker bid submitted and round finalized successfully',
              tiebreakerResolved: true,
              roundComplete: true
            });
          } else if (resumeResult.nextTiebreakerCreated) {
            console.log('   ⏸️  Next tiebreaker created\n');
            return NextResponse.json({
              success: true,
              newBidAmount,
              message: 'Tiebreaker bid submitted. Another tiebreaker created.',
              tiebreakerResolved: true,
              nextTiebreakerCreated: true
            });
          }
        } else {
          console.error('   ❌ Failed to resume finalization:', resumeResult.error);
        }
      } else {
        console.error('   ❌ Failed to resolve tiebreaker:', resolveResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      newBidAmount,
      message: 'Tiebreaker bid submitted successfully'
    });
  } catch (error) {
    console.error('Submit tiebreaker bid error:', error);
    return NextResponse.json(
      { error: 'Failed to submit tiebreaker bid' },
      { status: 500 }
    );
  }
}
