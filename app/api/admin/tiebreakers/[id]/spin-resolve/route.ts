import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { checkTiebreakerComplete, resolveTiebreaker, resumeFinalizationAfterTiebreaker } from '@/lib/auction/tiebreaker';

/**
 * POST /api/admin/tiebreakers/[id]/spin-resolve - Spin and resolve tiebreaker randomly
 * Winner gets original bid + 2
 * Loser gets original bid + 1
 */
/**
 * POST /api/admin/tiebreakers/[id]/spin-resolve - Spin and submit bids for all teams
 * Winner gets original bid + 2
 * Loser gets original bid + 1
 * Then lets normal resolution process handle the rest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('\n🎰 [SPIN RESOLVE] === Starting Spin & Resolve ===');
    
    // Check authentication - must be sub-admin or super-admin
    const session = await auth();
    if (!session || (session.user.role !== 'SUB_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      console.log('❌ [SPIN RESOLVE] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`✅ [SPIN RESOLVE] Authenticated as ${session.user.role}: ${session.user.email}`);

    const { id: tiebreakerId } = await params;
    console.log(`🎯 [SPIN RESOLVE] Tiebreaker ID: ${tiebreakerId}`);

    // Get tiebreaker details with all participating teams
    console.log('📊 [SPIN RESOLVE] Fetching tiebreaker details...');
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true
          }
        },
        round: {
          select: {
            id: true,
            seasonId: true
          }
        },
        teamTiebreakerBids: true
      }
    });

    if (!tiebreaker) {
      console.log('❌ [SPIN RESOLVE] Tiebreaker not found');
      return NextResponse.json({ error: 'Tiebreaker not found' }, { status: 404 });
    }

    console.log(`✅ [SPIN RESOLVE] Tiebreaker found: ${tiebreaker.basePlayer.name}`);
    console.log(`   Status: ${tiebreaker.status}`);
    console.log(`   Original Amount: £${tiebreaker.originalAmount}`);
    console.log(`   Participating Teams: ${tiebreaker.teamTiebreakerBids.length}`);

    // Fetch team details separately
    console.log('👥 [SPIN RESOLVE] Fetching team details...');
    const teamIds = tiebreaker.teamTiebreakerBids.map(bid => bid.teamId);
    console.log(`   Team IDs: ${teamIds.join(', ')}`);
    
    const teams = await prisma.teams.findMany({
      where: { id: { in: teamIds } },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`✅ [SPIN RESOLVE] Found ${teams.length} teams:`);
    teams.forEach(t => console.log(`   - ${t.name} (${t.id})`));

    const teamMap = new Map(teams.map(t => [t.id, t]));

    // Check if tiebreaker is active
    if (tiebreaker.status !== 'active') {
      console.log(`❌ [SPIN RESOLVE] Tiebreaker is not active (status: ${tiebreaker.status})`);
      return NextResponse.json(
        { error: `Tiebreaker is not active (status: ${tiebreaker.status})` },
        { status: 400 }
      );
    }

    const participatingTeams = tiebreaker.teamTiebreakerBids;

    if (participatingTeams.length < 2) {
      console.log(`❌ [SPIN RESOLVE] Not enough teams (${participatingTeams.length})`);
      return NextResponse.json(
        { error: 'Need at least 2 teams to spin and resolve' },
        { status: 400 }
      );
    }

    // Randomly select a winner
    console.log('\n🎲 [SPIN RESOLVE] Rolling the dice...');
    const randomIndex = Math.floor(Math.random() * participatingTeams.length);
    const winningTeamBid = participatingTeams[randomIndex];
    const winningTeamId = winningTeamBid.teamId;
    const winningTeam = teamMap.get(winningTeamId);
    const winningBidAmount = tiebreaker.originalAmount + 2; // Winner gets original + 2

    console.log(`🎯 [SPIN RESOLVE] Winner selected: ${winningTeam?.name || winningTeamId} (index ${randomIndex}/${participatingTeams.length - 1})`);
    console.log(`💰 [SPIN RESOLVE] Winning bid: £${winningBidAmount} (original: £${tiebreaker.originalAmount})`);

    // Update all team bids with their final amounts (just like admin submitting bids)
    console.log('\n💾 [SPIN RESOLVE] Submitting bids for all teams...');
    for (const teamBid of participatingTeams) {
      const isWinner = teamBid.teamId === winningTeamId;
      const finalBidAmount = isWinner ? winningBidAmount : tiebreaker.originalAmount + 1;
      const team = teamMap.get(teamBid.teamId);

      console.log(`   ${isWinner ? '🏆' : '💸'} ${team?.name || teamBid.teamId}: £${finalBidAmount}`);

      await prisma.team_tiebreaker_bids.update({
        where: {
          tiebreakerId_teamId: {
            tiebreakerId,
            teamId: teamBid.teamId
          }
        },
        data: {
          newBidAmount: finalBidAmount,
          submitted: true,
          submittedAt: new Date()
        }
      });
    }

    console.log('✅ [SPIN RESOLVE] All bids submitted');

    // Check if all teams have submitted (they should all be submitted now)
    const allSubmitted = await checkTiebreakerComplete(tiebreakerId);
    console.log(`\n📊 [SPIN RESOLVE] All teams submitted: ${allSubmitted}`);

    if (allSubmitted) {
      console.log(`🎯 [SPIN RESOLVE] Triggering async auto-resolve...`);
      
      // Trigger async resolution without waiting (same as normal bid submission)
      (async () => {
        try {
          // Resolve tiebreaker
          const resolveResult = await resolveTiebreaker(tiebreakerId);
          console.log(`🔍 [SPIN RESOLVE] resolveTiebreaker result:`, JSON.stringify(resolveResult));

          if (resolveResult.success && resolveResult.winnerId && resolveResult.winningBid) {
            console.log(`✅ [SPIN RESOLVE] Tiebreaker resolved - Winner: ${resolveResult.winnerId}, Bid: £${resolveResult.winningBid}`);
            
            // Auto-resume finalization
            const resumeResult = await resumeFinalizationAfterTiebreaker(tiebreakerId);
            console.log(`🔍 [SPIN RESOLVE] resumeFinalizationAfterTiebreaker result:`, JSON.stringify(resumeResult));

            if (resumeResult.success) {
              if (resumeResult.finalizationComplete) {
                console.log('✅ [SPIN RESOLVE] Round finalization COMPLETE');
              } else if (resumeResult.nextTiebreakerCreated) {
                console.log('⏸️  [SPIN RESOLVE] Next tiebreaker created - round still pending');
              } else {
                console.log('⏸️  [SPIN RESOLVE] Other active tiebreakers still pending - waiting');
              }
            } else {
              console.error('❌ [SPIN RESOLVE] resumeFinalizationAfterTiebreaker FAILED:', resumeResult.error);
            }
          } else {
            console.error('❌ [SPIN RESOLVE] resolveTiebreaker FAILED:', resolveResult.error);

            if (resolveResult.error?.includes('Another tie detected')) {
              console.log('🔄 [SPIN RESOLVE] Re-tie detected - marking tiebreaker completed');
              await prisma.tiebreakers.update({
                where: { id: tiebreakerId },
                data: { status: 'completed' }
              });
            }
          }
        } catch (error) {
          console.error('❌ [SPIN RESOLVE] Async resolution error:', error);
        }
      })();

      console.log('\n🎉 [SPIN RESOLVE] === Spin Complete - Resolution in Progress ===\n');

      // Return immediately to the user
      return NextResponse.json({
        success: true,
        winnerId: winningTeamId,
        winnerName: winningTeam?.name || winningTeamId,
        winningBid: winningBidAmount,
        playerName: tiebreaker.basePlayer.name,
        message: `${winningTeam?.name || winningTeamId} won ${tiebreaker.basePlayer.name} for £${winningBidAmount} via spin!`,
        resolutionInProgress: true
      });
    }

    console.log(`ℹ️  [SPIN RESOLVE] Not all teams submitted yet - this should not happen`);
    return NextResponse.json({
      success: true,
      message: 'Bids submitted successfully'
    });

  } catch (error) {
    console.error('\n❌ [SPIN RESOLVE] === ERROR ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('=========================\n');
    
    return NextResponse.json(
      { error: 'Failed to spin and resolve tiebreaker' },
      { status: 500 }
    );
  }
}
