import { prisma } from '@/lib/prisma'
import { generateTransferId, generateTiebreakerId, generateFinancialId } from '@/lib/id-generator';
import { Prisma } from '@prisma/client';

/**
 * Tiebreaker creation and resolution logic
 */

export interface TiebreakerInfo {
  id: string;
  roundId: string;
  basePlayerId: string;
  playerName: string;
  originalAmount: number;
  tiedTeams: string[];
}

/**
 * Create tiebreakers for tied bids
 */
export async function createTiebreakers(
  roundId: string,
  ties: Array<{
    basePlayerId: string;
    playerName: string;
    amount: number;
    tiedTeams: string[];
  }>
): Promise<TiebreakerInfo[]> {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 CREATING TIEBREAKERS');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId} | Ties to resolve: ${ties.length}\n`);

  const createdTiebreakers: TiebreakerInfo[] = [];

  for (const tie of ties) {
    // Generate tiebreaker ID using centralized ID generator
    const tiebreakerId = await generateTiebreakerId();

    // Create tiebreaker
    await prisma.tiebreakers.create({
      data: {
        id: tiebreakerId,
        roundId,
        basePlayerId: tie.basePlayerId,
        originalAmount: tie.amount,
        tiedTeamsCount: tie.tiedTeams.length,
        status: 'active'
      }
    });

    // Create team tiebreaker bid entries
    for (const teamId of tie.tiedTeams) {
      await prisma.team_tiebreaker_bids.create({
        data: {
          id: `${tiebreakerId}_${teamId}`,
          tiebreakerId,
          teamId,
          oldBidAmount: tie.amount,
          submitted: false
        }
      });
    }

    createdTiebreakers.push({
      id: tiebreakerId,
      roundId,
      basePlayerId: tie.basePlayerId,
      playerName: tie.playerName,
      originalAmount: tie.amount,
      tiedTeams: tie.tiedTeams
    });
  }

  console.log(`✅ Successfully created ${createdTiebreakers.length} tiebreakers`);
  console.log('='.repeat(80) + '\n');

  return createdTiebreakers;
}

/**
 * Check if all teams have submitted tiebreaker bids
 */
export async function checkTiebreakerComplete(tiebreakerId: string): Promise<boolean> {
  const bids = await prisma.team_tiebreaker_bids.findMany({
    where: { tiebreakerId },
    select: { submitted: true }
  });

  return bids.every(bid => bid.submitted);
}

/**
 * Resolve a tiebreaker
 */
export async function resolveTiebreaker(tiebreakerId: string): Promise<{
  success: boolean;
  winnerId?: string;
  winningBid?: number;
  error?: string;
}> {
  console.log('\n' + '='.repeat(80));
  console.log('⚔️ STARTING TIEBREAKER RESOLUTION');
  console.log('='.repeat(80));
  console.log(`Tiebreaker ID: ${tiebreakerId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Get tiebreaker details
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        basePlayerId: true,
        roundId: true,
        round: {
          select: { seasonId: true }
        }
      }
    });

    if (!tiebreaker) {
      return { success: false, error: 'Tiebreaker not found' };
    }

    if (tiebreaker.status !== 'active') {
      return { success: false, error: 'Tiebreaker already resolved' };
    }

    // Get all submitted bids
    const bids = await prisma.team_tiebreaker_bids.findMany({
      where: {
        tiebreakerId,
        submitted: true
      },
      select: {
        teamId: true,
        newBidAmount: true
      }
    });

    if (bids.length === 0) {
      return { success: false, error: 'No bids submitted' };
    }

    // Find highest bid
    const validBids = bids.filter(b => b.newBidAmount !== null);
    if (validBids.length === 0) {
      return { success: false, error: 'No valid bids' };
    }

    const sorted = validBids.sort((a, b) => b.newBidAmount! - a.newBidAmount!);

    // Check for another tie
    if (sorted.length > 1 && sorted[0].newBidAmount === sorted[1].newBidAmount) {
      return { success: false, error: 'Another tie detected - manual resolution required' };
    }

    const winner = sorted[0];

    // Update tiebreaker
    await prisma.tiebreakers.update({
      where: { id: tiebreakerId },
      data: {
        status: 'completed',
        winningTeamId: winner.teamId,
        winningBid: winner.newBidAmount!
      }
    });

    return {
      success: true,
      winnerId: winner.teamId,
      winningBid: winner.newBidAmount!
    };
  } catch (error) {
    console.error('Tiebreaker resolution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Apply tiebreaker result to database
 */
export async function applyTiebreakerResult(
  tiebreakerId: string,
  winnerId: string,
  winningBid: number
): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('💾 APPLYING TIEBREAKER RESULT');
  console.log('='.repeat(80));
  console.log(`Tiebreaker ID: ${tiebreakerId} | Winner ID: ${winnerId} | Bid: £${winningBid.toLocaleString()}\n`);

  const tiebreaker = await prisma.tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      basePlayerId: true,
      roundId: true,
      round: {
        select: { seasonId: true }
      },
      basePlayer: {
        select: { name: true }
      }
    }
  });

  if (!tiebreaker) {
    throw new Error('Tiebreaker not found');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Create transfer history
    const transferId = await generateTransferId();
    await tx.transfer_history.create({
      data: {
        id: transferId,
        basePlayerId: tiebreaker.basePlayerId,
        seasonId: tiebreaker.round.seasonId,
        teamId: winnerId,
        soldPrice: winningBid
      }
    });

    // 2. Update team budget
    const seasonTeam = await tx.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: tiebreaker.round.seasonId,
          teamId: winnerId
        }
      }
    });

    if (seasonTeam) {
      const newBudget = seasonTeam.currentBudget - winningBid;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winnerId
          }
        },
        data: { currentBudget: newBudget }
      });

      // 3. Insert financial ledger entry
      const ledgerId = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId,
          seasonTeamId: seasonTeam.id,
          seasonId: tiebreaker.round.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          previousBalance: seasonTeam.currentBudget,
          newBalance: newBudget,
          description: `Tiebreaker ${tiebreakerId} - Player purchase`,
          playerName: tiebreaker.basePlayer.name
        }
      });
    }
  });
}

/**
 * Get active tiebreakers for a round
 */
export async function getActiveTiebreakers(roundId: string): Promise<TiebreakerInfo[]> {
  const tiebreakers = await prisma.tiebreakers.findMany({
    where: {
      roundId,
      status: 'active'
    },
    select: {
      id: true,
      roundId: true,
      basePlayerId: true,
      originalAmount: true,
      tiedTeamsCount: true,
      basePlayer: {
        select: { name: true }
      },
      teamTiebreakerBids: {
        select: { teamId: true }
      }
    }
  });

  return tiebreakers.map(tb => ({
    id: tb.id,
    roundId: tb.roundId,
    basePlayerId: tb.basePlayerId,
    playerName: tb.basePlayer.name,
    originalAmount: tb.originalAmount,
    tiedTeams: tb.teamTiebreakerBids.map(b => b.teamId)
  }));
}

/**
 * Check if round has any active tiebreakers
 */
export async function hasActiveTiebreakers(roundId: string): Promise<boolean> {
  const count = await prisma.tiebreakers.count({
    where: {
      roundId,
      status: 'active'
    }
  });

  return count > 0;
}

/**
 * Resolve all tiebreakers for a round
 */
export async function resolveAllTiebreakers(roundId: string): Promise<{
  success: boolean;
  resolved: number;
  failed: number;
  errors: string[];
}> {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 RESOLVING ALL TIEBREAKERS');
  console.log('='.repeat(80));
  console.log(`Round ID: ${roundId}\n`);

  const tiebreakers = await getActiveTiebreakers(roundId);
  let resolved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const tb of tiebreakers) {
    const result = await resolveTiebreaker(tb.id);
    
    if (result.success && result.winnerId && result.winningBid) {
      await applyTiebreakerResult(tb.id, result.winnerId, result.winningBid);
      resolved++;
    } else {
      failed++;
      errors.push(`${tb.playerName}: ${result.error}`);
    }
  }

  console.log(`\n✅ Finished resolving all tiebreakers`);
  console.log(`   📊 Summary: Resolved: ${resolved} | Failed: ${failed}`);
  console.log('='.repeat(80) + '\n');

  return {
    success: failed === 0,
    resolved,
    failed,
    errors
  };
}

/**
 * Auto-resume finalization after tiebreaker resolution
 * This is called when a tiebreaker is resolved to continue the finalization process
 */
export async function resumeFinalizationAfterTiebreaker(
  tiebreakerId: string
): Promise<{
  success: boolean;
  finalizationComplete: boolean;
  nextTiebreakerCreated: boolean;
  previewMode?: boolean;
  error?: string;
}> {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 AUTO-RESUMING FINALIZATION AFTER TIEBREAKER');
    console.log('='.repeat(80));
    console.log(`Tiebreaker ID: ${tiebreakerId}\n`);

    // Get tiebreaker details
    const tiebreaker = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        roundId: true,
        status: true,
        winningTeamId: true,
        winningBid: true,
        round: {
          select: {
            finalizationState: true
          }
        }
      }
    });

    if (!tiebreaker) {
      return {
        success: false,
        finalizationComplete: false,
        nextTiebreakerCreated: false,
        error: 'Tiebreaker not found'
      };
    }

    if (tiebreaker.status !== 'completed') {
      return {
        success: false,
        finalizationComplete: false,
        nextTiebreakerCreated: false,
        error: 'Tiebreaker not resolved yet'
      };
    }

    // Check if we're in preview mode
    const finalizationState = tiebreaker.round.finalizationState as any;
    const isPreviewMode = finalizationState?.previewMode === true;

    console.log(`   ✓ Tiebreaker resolved`);
    console.log(`   ✓ Winner: Team ${tiebreaker.winningTeamId}`);
    console.log(`   ✓ Winning bid: £${tiebreaker.winningBid?.toLocaleString()}`);
    console.log(`   ✓ Preview mode: ${isPreviewMode ? 'YES' : 'NO'}\n`);

    // Check if there are other active tiebreakers for this round
    const otherActiveTiebreakers = await prisma.tiebreakers.count({
      where: {
        roundId: tiebreaker.roundId,
        status: 'active',
        id: { not: tiebreakerId }
      }
    });

    if (otherActiveTiebreakers > 0) {
      console.log(`   ⏸️  Other active tiebreakers exist (${otherActiveTiebreakers})`);
      console.log(`   ℹ️  Waiting for all tiebreakers to resolve before resuming\n`);
      return {
        success: true,
        finalizationComplete: false,
        nextTiebreakerCreated: false,
        previewMode: isPreviewMode
      };
    }

    console.log('   ✓ No other active tiebreakers - resuming finalization...\n');

    // Get player name for the allocation
    const tiebreakerWithPlayer = await prisma.tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        basePlayerId: true,
        winningTeamId: true,
        winningBid: true,
        basePlayer: {
          select: {
            name: true
          }
        }
      }
    });

    // Update finalization state to include the tiebreaker winner's allocation
    if (tiebreakerWithPlayer && finalizationState) {
      const tiebreakerAllocation = {
        teamId: tiebreakerWithPlayer.winningTeamId!,
        basePlayerId: tiebreakerWithPlayer.basePlayerId,
        playerName: tiebreakerWithPlayer.basePlayer.name,
        amount: tiebreakerWithPlayer.winningBid!,
        acquisitionType: 'tiebreaker_won' as const,
        acquisitionNotes: `Won tiebreaker with bid of £${tiebreakerWithPlayer.winningBid!.toLocaleString()}`
      };

      const updatedState = {
        ...finalizationState,
        allocatedTeams: [...(finalizationState.allocatedTeams || []), tiebreakerWithPlayer.winningTeamId!],
        allocatedPlayers: [...(finalizationState.allocatedPlayers || []), tiebreakerWithPlayer.basePlayerId],
        processedAllocations: [...(finalizationState.processedAllocations || []), tiebreakerAllocation]
      };

      await prisma.rounds.update({
        where: { id: tiebreaker.roundId },
        data: {
          finalizationState: JSON.parse(JSON.stringify(updatedState))
        }
      });

      console.log(`   ✓ Updated state with tiebreaker winner: ${tiebreakerWithPlayer.basePlayer.name} → Team ${tiebreakerWithPlayer.winningTeamId}\n`);
    }

    // Import finalizeRound dynamically to avoid circular dependency
    const { finalizeRound, applyFinalizationResults } = await import('./finalize-round');

    // Resume finalization
    const result = await finalizeRound(tiebreaker.roundId);

    if (result.tieDetected && result.ties && result.ties.length > 0) {
      // Another tie found - create next tiebreaker
      console.log('   ⚠️  Another tie detected - creating next tiebreaker...\n');
      
      const nextTiebreakers = await createTiebreakers(tiebreaker.roundId, result.ties);
      
      console.log(`   ✓ Created ${nextTiebreakers.length} tiebreaker(s)`);
      console.log('   ⏸️  Finalization paused again\n');
      console.log('='.repeat(80) + '\n');

      return {
        success: true,
        finalizationComplete: false,
        nextTiebreakerCreated: true,
        previewMode: isPreviewMode
      };
    } else if (result.success) {
      // Finalization complete
      console.log('   ✅ No more ties\n');
      
      if (isPreviewMode) {
        // Preview mode - Save results to preview_allocations table
        console.log('   👁️  PREVIEW MODE - Saving results to preview_allocations table');
        console.log('   📊 Results calculated and ready for admin review\n');
        
        // Delete any existing preview allocations for this round (in case of re-preview)
        await prisma.preview_allocations.deleteMany({
          where: { roundId: tiebreaker.roundId }
        });

        // Insert preview allocations
        await prisma.preview_allocations.createMany({
          data: result.allocations.map(alloc => ({
            roundId: tiebreaker.roundId,
            teamId: alloc.teamId,
            basePlayerId: alloc.basePlayerId,
            playerName: alloc.playerName,
            amount: alloc.amount,
            acquisitionType: alloc.acquisitionType,
            acquisitionNotes: alloc.acquisitionNotes || null
          }))
        });

        console.log(`   ✓ Saved ${result.allocations.length} allocations to preview table`);
        
        await prisma.rounds.update({
          where: { id: tiebreaker.roundId },
          data: { 
            status: 'preview_finalized',
            finalizationState: Prisma.JsonNull
          }
        });

        console.log('   ✅ Round marked as preview_finalized');
        console.log('='.repeat(80) + '\n');

        return {
          success: true,
          finalizationComplete: true,
          nextTiebreakerCreated: false,
          previewMode: true
        };
      } else {
        // Normal mode - apply results
        console.log('   💾 Applying final results to database...\n');
        
        await applyFinalizationResults(tiebreaker.roundId, result.allocations);
        
        // Mark round as completed
        await prisma.rounds.update({
          where: { id: tiebreaker.roundId },
          data: { 
            status: 'completed',
            finalizationState: Prisma.JsonNull
          }
        });

        console.log('   ✅ Round finalization COMPLETE');
        console.log('='.repeat(80) + '\n');

        return {
          success: true,
          finalizationComplete: true,
          nextTiebreakerCreated: false,
          previewMode: false
        };
      }
    } else {
      console.log('   ❌ Finalization failed:', result.error);
      console.log('='.repeat(80) + '\n');

      return {
        success: false,
        finalizationComplete: false,
        nextTiebreakerCreated: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('Resume finalization error:', error);
    return {
      success: false,
      finalizationComplete: false,
      nextTiebreakerCreated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
