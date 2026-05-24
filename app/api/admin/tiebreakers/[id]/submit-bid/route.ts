import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateReserve, validateBidAgainstReserve } from '@/lib/auction/reserve-calculator-v2';
import { checkTiebreakerComplete, resolveTiebreaker, resumeFinalizationAfterTiebreaker } from '@/lib/auction/tiebreaker';

/**
 * POST /api/admin/tiebreakers/[id]/submit-bid - Sub-admin submits tiebreaker bid on behalf of a team
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication - must be sub-admin or super-admin
    const session = await auth();
    if (!session || (session.user.role !== 'SUB_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tiebreakerId } = await params;
    const body = await request.json();
    const { teamId, newBidAmount } = body;

    // Validate inputs
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

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
        { error: 'Bid already submitted for this team' },
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

    // Get squad size (ACTIVE players only)
    const squadSize = await prisma.transfer_history.count({
      where: {
        teamId,
        seasonId: tiebreaker.round.seasonId,
        status: 'ACTIVE'
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

    console.log(`✅ [ADMIN TIEBREAKER] Sub-admin submitted bid for team ${teamId}: £${newBidAmount}`);

    // Check if all teams have submitted
    const allSubmitted = await checkTiebreakerComplete(tiebreakerId);
    console.log(`\n📊 [ADMIN TIEBREAKER] tiebreakerId=${tiebreakerId} | allSubmitted=${allSubmitted}`);

    if (allSubmitted) {
      console.log(`🎯 [ADMIN TIEBREAKER] All teams submitted - triggering async auto-resolve...`);
      
      // Trigger async resolution without waiting
      (async () => {
        try {
          // Resolve tiebreaker
          const resolveResult = await resolveTiebreaker(tiebreakerId);
          console.log(`🔍 [ADMIN TIEBREAKER] resolveTiebreaker result:`, JSON.stringify(resolveResult));

          if (resolveResult.success && resolveResult.winnerId && resolveResult.winningBid) {
            console.log(`✅ [ADMIN TIEBREAKER] Tiebreaker resolved - Winner: ${resolveResult.winnerId}, Bid: £${resolveResult.winningBid}`);
            
            // Auto-resume finalization
            const resumeResult = await resumeFinalizationAfterTiebreaker(tiebreakerId);
            console.log(`🔍 [ADMIN TIEBREAKER] resumeFinalizationAfterTiebreaker result:`, JSON.stringify(resumeResult));

            if (resumeResult.success) {
              if (resumeResult.finalizationComplete) {
                console.log('✅ [ADMIN TIEBREAKER] Round finalization COMPLETE');
              } else if (resumeResult.nextTiebreakerCreated) {
                console.log('⏸️  [ADMIN TIEBREAKER] Next tiebreaker created - round still pending');
              } else {
                console.log('⏸️  [ADMIN TIEBREAKER] Other active tiebreakers still pending - waiting');
              }
            } else {
              console.error('❌ [ADMIN TIEBREAKER] resumeFinalizationAfterTiebreaker FAILED:', resumeResult.error);
            }
          } else {
            console.error('❌ [ADMIN TIEBREAKER] resolveTiebreaker FAILED:', resolveResult.error);

            if (resolveResult.error?.includes('Another tie detected')) {
              console.log('🔄 [ADMIN TIEBREAKER] Re-tie detected - marking tiebreaker completed');
              await prisma.tiebreakers.update({
                where: { id: tiebreakerId },
                data: { status: 'completed' }
              });
            }
          }
        } catch (error) {
          console.error('❌ [ADMIN TIEBREAKER] Async resolution error:', error);
        }
      })();

      // Return immediately
      return NextResponse.json({
        success: true,
        newBidAmount,
        message: 'Bid submitted successfully. Resolution in progress...',
        tiebreakerResolved: false,
        resolutionInProgress: true
      });
    }

    console.log(`ℹ️  [ADMIN TIEBREAKER] Not all teams submitted yet for ${tiebreakerId} - waiting`);
    return NextResponse.json({
      success: true,
      newBidAmount,
      message: 'Bid submitted successfully'
    });

  } catch (error) {
    console.error('Submit admin tiebreaker bid error:', error);
    return NextResponse.json(
      { error: 'Failed to submit tiebreaker bid' },
      { status: 500 }
    );
  }
}
