import { prisma } from '@/lib/prisma'
import { generateTransferId, generateFinancialId } from '@/lib/id-generator';

/**
 * Bulk tiebreaker finalization logic
 * "Last Person Standing" auction system
 */

export interface BulkTiebreakerResult {
  success: boolean;
  winnerId?: string;
  winningBid?: number;
  error?: string;
}

/**
 * Check if bulk tiebreaker should auto-finalize
 * Conditions:
 * 1. Only 1 team remains active
 * 2. 24 hours elapsed (safety limit)
 */
export async function shouldAutoFinalizeBulkTiebreaker(
  tiebreakerId: number
): Promise<boolean> {
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      teamsRemaining: true,
      startTime: true,
      maxEndTime: true
    }
  });

  if (!tiebreaker) return false;

  // Condition 1: Only 1 team remaining
  if (tiebreaker.teamsRemaining === 1) {
    return true;
  }

  // Condition 2: 24 hours elapsed
  if (tiebreaker.maxEndTime) {
    const now = new Date();
    if (now >= tiebreaker.maxEndTime) {
      return true;
    }
  }

  return false;
}

/**
 * Finalize bulk tiebreaker
 */
export async function finalizeBulkTiebreaker(
  tiebreakerId: number
): Promise<BulkTiebreakerResult> {
  try {
    console.log(`🎯 Finalizing bulk tiebreaker ${tiebreakerId}...`);
    
    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        currentHighestBid: true,
        currentHighestTeamId: true,
        teamsRemaining: true,
        participants: {
          where: { status: 'active' },
          select: {
            teamId: true,
            currentBid: true
          }
        }
      }
    });

    if (!tiebreaker) {
      console.log(`❌ Tiebreaker not found`);
      return { success: false, error: 'Tiebreaker not found' };
    }

    console.log(`📊 Tiebreaker status: ${tiebreaker.status}, teams remaining: ${tiebreaker.teamsRemaining}`);
    console.log(`📊 Active participants:`, tiebreaker.participants);

    if (tiebreaker.status !== 'active') {
      console.log(`❌ Tiebreaker not active (status: ${tiebreaker.status})`);
      return { success: false, error: 'Tiebreaker already finalized' };
    }

    // Check if should auto-finalize
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    console.log(`📊 Should finalize check: ${shouldFinalize}`);
    
    if (!shouldFinalize) {
      return { success: false, error: 'Tiebreaker not ready to finalize' };
    }

    // Determine winner
    let winnerId: string | null = null;
    let winningBid: number | null = null;

    if (tiebreaker.teamsRemaining === 1) {
      console.log(`🏆 Only 1 team remaining - finding winner...`);
      console.log(`📊 Active participants:`, tiebreaker.participants);
      
      // Only 1 team remaining - they win with their current bid (or highest bid)
      const activeParticipant = tiebreaker.participants[0]; // Should only be 1 active
      
      if (activeParticipant) {
        winnerId = activeParticipant.teamId;
        // Use their current bid, or fall back to the tiebreaker's highest bid
        winningBid = activeParticipant.currentBid || tiebreaker.currentHighestBid;
        console.log(`🏆 Winner: ${winnerId} with bid £${winningBid}`);
      } else {
        console.log(`⚠️ No active participant found, checking highest bidder...`);
        // Fallback: use the highest bidder from the tiebreaker
        if (tiebreaker.currentHighestTeamId && tiebreaker.currentHighestBid) {
          winnerId = tiebreaker.currentHighestTeamId;
          winningBid = tiebreaker.currentHighestBid;
          console.log(`🏆 Winner (fallback): ${winnerId} with bid £${winningBid}`);
        }
      }
    } else if (tiebreaker.currentHighestTeamId && tiebreaker.currentHighestBid) {
      console.log(`⏰ 24 hours elapsed - highest bidder wins`);
      // 24 hours elapsed - highest bidder wins
      winnerId = tiebreaker.currentHighestTeamId;
      winningBid = tiebreaker.currentHighestBid;
      console.log(`🏆 Winner: ${winnerId} with bid £${winningBid}`);
    }

    if (!winnerId || !winningBid) {
      console.log(`❌ No valid winner found`);
      return { success: false, error: 'No valid winner found' };
    }

    // Update tiebreaker status
    console.log(`💾 Updating tiebreaker status to completed...`);
    await prisma.bulk_tiebreakers.update({
      where: { id: tiebreakerId },
      data: {
        status: 'completed',
        currentHighestTeamId: winnerId,
        currentHighestBid: winningBid
      }
    });

    try {
      const { tiebreakerEvents } = await import('./tiebreaker-events');
      tiebreakerEvents.emit(`change:${tiebreakerId}`);
    } catch (e) {
      console.error('Error emitting tiebreaker change event on finalization:', e);
    }

    console.log(`✅ Tiebreaker finalized successfully!`);
    return {
      success: true,
      winnerId,
      winningBid
    };
  } catch (error) {
    console.error('Bulk tiebreaker finalization error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Apply bulk tiebreaker result to database
 */
export async function applyBulkTiebreakerResult(
  tiebreakerId: number,
  winnerId: string,
  winningBid: number
): Promise<void> {
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      basePlayerId: true,
      roundId: true,
      basePlayer: {
        select: { name: true }
      }
    }
  });

  if (!tiebreaker) {
    throw new Error('Tiebreaker not found');
  }

  // Get season from round
  const round = await prisma.rounds.findUnique({
    where: { id: tiebreaker.roundId },
    select: { seasonId: true }
  });

  if (!round) {
    throw new Error('Round not found');
  }

  // Pre-generate IDs outside transaction
  const transferId = await generateTransferId();
  const ledgerId = await generateFinancialId();

  await prisma.$transaction(async (tx) => {
    // 1. Create transfer history
    await tx.transfer_history.create({
      data: {
        id: transferId,
        basePlayerId: tiebreaker.basePlayerId,
        seasonId: round.seasonId,
        teamId: winnerId,
        soldPrice: winningBid,
        roundId: tiebreaker.roundId
      }
    });

    // 2. Update team budget
    const seasonTeam = await tx.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId: winnerId
        }
      }
    });

    if (seasonTeam) {
      const newBudget = seasonTeam.currentBudget - winningBid;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: round.seasonId,
            teamId: winnerId
          }
        },
        data: { currentBudget: newBudget }
      });

      // 3. Insert financial ledger entry
      await tx.financial_ledger.create({
        data: {
          id: ledgerId,
          seasonTeamId: seasonTeam.id,
          seasonId: round.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          previousBalance: seasonTeam.currentBudget,
          newBalance: newBudget,
          description: `Bulk tiebreaker ${tiebreakerId} - Player purchase`,
          playerName: tiebreaker.basePlayer.name
        }
      });
    }
  }, {
    timeout: 10000 // 10 second timeout
  });
}

/**
 * Process team withdrawal from bulk tiebreaker
 */
export async function withdrawFromBulkTiebreaker(
  tiebreakerId: number,
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if team is the highest bidder
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: { 
        currentHighestTeamId: true,
        status: true
      }
    });

    if (!tiebreaker) {
      return { success: false, error: 'Tiebreaker not found' };
    }

    if (tiebreaker.status !== 'active') {
      return { success: false, error: 'Tiebreaker is not active' };
    }

    if (tiebreaker.currentHighestTeamId === teamId) {
      return { 
        success: false, 
        error: 'Cannot withdraw while you have the highest bid. Wait to be outbid first.' 
      };
    }

    await prisma.$transaction(async (tx) => {
      // Update participant status
      await tx.bulk_tiebreaker_participants.updateMany({
        where: {
          tiebreakerId,
          teamId
        },
        data: {
          status: 'withdrawn'
        }
      });

      // Decrement teams remaining
      const tiebreaker = await tx.bulk_tiebreakers.findUnique({
        where: { id: tiebreakerId },
        select: { teamsRemaining: true }
      });

      if (tiebreaker) {
        await tx.bulk_tiebreakers.update({
          where: { id: tiebreakerId },
          data: {
            teamsRemaining: Math.max(0, tiebreaker.teamsRemaining - 1)
          }
        });
      }
    }, {
      timeout: 15000, // 15 second timeout
      maxWait: 10000  // Wait max 10 seconds to acquire connection
    });

    // Small delay to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if should auto-finalize
    console.log(`🔍 Checking auto-finalization for tiebreaker ${tiebreakerId}...`);
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    console.log(`📊 Should finalize: ${shouldFinalize}`);
    
    if (shouldFinalize) {
      console.log(`🎯 Auto-finalizing tiebreaker ${tiebreakerId}...`);
      const result = await finalizeBulkTiebreaker(tiebreakerId);
      console.log(`📊 Finalization result:`, result);
      
      if (result.success && result.winnerId && result.winningBid) {
        console.log(`💰 Applying result: Winner=${result.winnerId}, Bid=£${result.winningBid}`);
        await applyBulkTiebreakerResult(tiebreakerId, result.winnerId, result.winningBid);
        console.log(`✅ Tiebreaker ${tiebreakerId} finalized successfully!`);
      }
    }

    try {
      const { tiebreakerEvents } = await import('./tiebreaker-events');
      tiebreakerEvents.emit(`change:${tiebreakerId}`);
    } catch (e) {
      console.error('Error emitting tiebreaker change event on withdrawal:', e);
    }

    return { success: true };
  } catch (error) {
    console.error('Withdrawal error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Place bid in bulk tiebreaker
 */
export async function placeBulkTiebreakerBid(
  tiebreakerId: number,
  teamId: string,
  bidAmount: number
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    // Validate bid
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        currentHighestBid: true,
        basePrice: true,
        roundId: true
      }
    });

    if (!tiebreaker) {
      return { success: false, error: 'Tiebreaker not found' };
    }

    if (tiebreaker.status !== 'active') {
      return { success: false, error: 'Tiebreaker is not active' };
    }

    const minBid = tiebreaker.currentHighestBid
      ? tiebreaker.currentHighestBid + 1
      : tiebreaker.basePrice;

    if (bidAmount < minBid) {
      return {
        success: false,
        error: `Bid must be at least ${minBid}`
      };
    }

    // Check team budget and get round info
    const round = await prisma.rounds.findFirst({
      where: {
        bulkRoundSelections: {
          some: { roundId: tiebreaker.roundId }
        }
      },
      select: { 
        seasonId: true,
        roundNumber: true
      }
    });

    if (!round) {
      return { success: false, error: 'Round not found' };
    }

    const seasonTeam = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId
        }
      },
      select: { currentBudget: true }
    });

    if (!seasonTeam || bidAmount > seasonTeam.currentBudget) {
      return { success: false, error: 'Insufficient budget' };
    }

    // ENHANCED: Check reserve requirements using Prisma
    
    // Get team balance from season_teams
    const seasonTeamObj = await prisma.season_teams.findUnique({
      where: {
        seasonId_teamId: { seasonId: round.seasonId, teamId }
      },
      select: { currentBudget: true }
    });
    
    if (!seasonTeamObj) {
      return { success: false, error: 'Team not found in season_teams' };
    }
    
    const teamBalance = seasonTeamObj.currentBudget;
    
    // Get current squad size by counting transfer history records for this team & season
    const currentSquadSize = await prisma.transfer_history.count({
      where: { teamId, seasonId: round.seasonId }
    });
    
    // Get auction settings
    const settingsResult = await prisma.$queryRaw<any[]>`
      SELECT 
        phase_1_end_round,
        phase_1_min_balance,
        phase_2_end_round,
        phase_2_min_balance,
        phase_3_min_balance,
        min_squad_size,
        max_squad_size
      FROM auction_settings
      WHERE "seasonId" = ${round.seasonId}
    `;
    
    // Calculate reserve if settings exist
    if (settingsResult && settingsResult.length > 0) {
      const { calculateReserveCore, validateBidAgainstReserve } = await import('./reserve-calculator-v2');
      
      const settings = settingsResult[0];
      const config = {
        phase_1_end_round: parseInt(settings.phase_1_end_round) || 18,
        phase_1_min_balance: parseInt(settings.phase_1_min_balance) || 30,
        phase_2_end_round: parseInt(settings.phase_2_end_round) || 20,
        phase_2_min_balance: parseInt(settings.phase_2_min_balance) || 30,
        phase_3_min_balance: parseInt(settings.phase_3_min_balance) || 10,
        min_squad_size: parseInt(settings.min_squad_size) || 25,
        max_squad_size: parseInt(settings.max_squad_size) || 30
      };
      
      const reserveInfo = calculateReserveCore(
        round.roundNumber,
        teamBalance,
        currentSquadSize,
        config
      );
      
      // Validate bid against reserve
      const validation = validateBidAgainstReserve(bidAmount, reserveInfo);
      
      if (!validation.valid) {
        return { 
          success: false, 
          error: validation.error 
        };
      }
      
      // If there's a warning, we'll return it with success
      if (validation.warning) {
        // Continue with bid placement but include warning
        console.log(`⚠️ Tiebreaker bid warning for team ${teamId}: ${validation.warning}`);
      }
    }
 
    // Place bid
    await prisma.$transaction(async (tx) => {
      // Update tiebreaker with concurrency control
      const updateResult = await tx.bulk_tiebreakers.updateMany({
        where: { 
          id: tiebreakerId,
          OR: [
            { currentHighestBid: { lt: bidAmount } },
            { currentHighestBid: null }
          ]
        },
        data: {
          currentHighestBid: bidAmount,
          currentHighestTeamId: teamId
        }
      });
      
      if (updateResult.count === 0) {
        throw new Error('A higher or equal bid was already placed. Please bid again with a higher amount.');
      }
 
      // Update participant
      await tx.bulk_tiebreaker_participants.updateMany({
        where: {
          tiebreakerId,
          teamId
        },
        data: {
          currentBid: bidAmount,
          lastBidTime: new Date()
        }
      });
 
      // Insert bid history
      await tx.bulk_tiebreaker_bid_history.create({
        data: {
          tiebreakerId,
          teamId,
          bidAmount
        }
      });
    });
 
    // Return success with optional warning
    const result: { success: boolean; warning?: string } = { success: true };
    
    // Check if there was a warning from reserve validation
    if (settingsResult && settingsResult.length > 0) {
      const { calculateReserveCore, validateBidAgainstReserve } = await import('./reserve-calculator-v2');
      
      const settings = settingsResult[0];
      const config = {
        phase_1_end_round: parseInt(settings.phase_1_end_round) || 18,
        phase_1_min_balance: parseInt(settings.phase_1_min_balance) || 30,
        phase_2_end_round: parseInt(settings.phase_2_end_round) || 20,
        phase_2_min_balance: parseInt(settings.phase_2_min_balance) || 30,
        phase_3_min_balance: parseInt(settings.phase_3_min_balance) || 10,
        min_squad_size: parseInt(settings.min_squad_size) || 25,
        max_squad_size: parseInt(settings.max_squad_size) || 30
      };
      
      const reserveInfo = calculateReserveCore(
        round.roundNumber,
        teamBalance,
        currentSquadSize,
        config
      );
      
      const validation = validateBidAgainstReserve(bidAmount, reserveInfo);
      if (validation.warning) {
        result.warning = validation.warning;
      }
    }
    
    try {
      const { tiebreakerEvents } = await import('./tiebreaker-events');
      tiebreakerEvents.emit(`change:${tiebreakerId}`);
    } catch (e) {
      console.error('Error emitting tiebreaker change event on bid:', e);
    }
    
    return result;
  } catch (error) {
    console.error('Bid placement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
