import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateReserve, validateBidAgainstReserve } from '@/lib/auction/reserve-calculator-v2';
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

    // Check budget with reserves using new reserve calculator
    const reserveInfo = await calculateReserve(teamId, tiebreaker.roundId, tiebreaker.round.seasonId);
    
    // Validate bid against reserve
    const validation = validateBidAgainstReserve(newBidAmount, reserveInfo);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Bid exceeds reserve requirements' },
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
    console.log(`\n📊 [TIEBREAKER DEBUG] tiebreakerId=${tiebreakerId} | allSubmitted=${allSubmitted}`);

    if (allSubmitted) {
      console.log(`🎯 [TIEBREAKER DEBUG] All teams submitted - starting auto-resolve...`);
      
      // Resolve tiebreaker
      const resolveResult = await resolveTiebreaker(tiebreakerId);
      console.log(`🔍 [TIEBREAKER DEBUG] resolveTiebreaker result:`, JSON.stringify(resolveResult));

      if (resolveResult.success && resolveResult.winnerId && resolveResult.winningBid) {
        console.log(`✅ [TIEBREAKER DEBUG] Tiebreaker resolved - Winner: ${resolveResult.winnerId}, Bid: £${resolveResult.winningBid}`);
        
        // Auto-resume finalization
        const resumeResult = await resumeFinalizationAfterTiebreaker(tiebreakerId);
        console.log(`🔍 [TIEBREAKER DEBUG] resumeFinalizationAfterTiebreaker result:`, JSON.stringify(resumeResult));

        if (resumeResult.success) {
          if (resumeResult.finalizationComplete) {
            console.log('✅ [TIEBREAKER DEBUG] Round finalization COMPLETE');
            return NextResponse.json({
              success: true,
              newBidAmount,
              message: 'Tiebreaker bid submitted and round finalized successfully',
              tiebreakerResolved: true,
              roundComplete: true
            });
          } else if (resumeResult.nextTiebreakerCreated) {
            console.log('⏸️  [TIEBREAKER DEBUG] Next tiebreaker created - round still pending');
            return NextResponse.json({
              success: true,
              newBidAmount,
              message: 'Tiebreaker bid submitted. Another tiebreaker created.',
              tiebreakerResolved: true,
              nextTiebreakerCreated: true
            });
          } else {
            // success=true but no complete, no nextTiebreaker => other active tiebreakers exist
            console.log('⏸️  [TIEBREAKER DEBUG] Other active tiebreakers still pending - waiting');
          }
        } else {
          console.error('❌ [TIEBREAKER DEBUG] resumeFinalizationAfterTiebreaker FAILED:', resumeResult.error);
          return NextResponse.json({
            success: true,
            newBidAmount,
            message: 'Bid submitted but auto-resume failed. Admin may need to manually finalize.',
            tiebreakerResolved: true,
            resumeError: resumeResult.error
          });
        }
      } else {
        // resolveTiebreaker failed (e.g. another tie detected)
        console.error('❌ [TIEBREAKER DEBUG] resolveTiebreaker FAILED:', resolveResult.error);

        if (resolveResult.error?.includes('Another tie detected')) {
          console.log('🔄 [TIEBREAKER DEBUG] Re-tie detected - marking tiebreaker completed so admin can Force Re-finalize');
          // Mark the old tiebreaker completed (all bids are in, but tied)
          // The sub-admin must click "Force Re-finalize" which will resume and create the next tiebreaker cleanly
          await prisma.tiebreakers.update({
            where: { id: tiebreakerId },
            data: { status: 'completed' }
          });
          return NextResponse.json({
            success: true,
            newBidAmount,
            message: 'Re-tie detected! All bids are tied again. The sub-admin must click "Force Re-finalize" to create the next tiebreaker.',
            tiebreakerResolved: false,
            reTieDetected: true
          });
        }

        return NextResponse.json({
          success: true,
          newBidAmount,
          message: `Bid submitted but tiebreaker could not be auto-resolved: ${resolveResult.error}. Admin intervention required.`,
          tiebreakerResolved: false,
          resolveError: resolveResult.error
        });
      }
    }

    console.log(`ℹ️  [TIEBREAKER DEBUG] Not all teams submitted yet for ${tiebreakerId} - waiting`);
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
