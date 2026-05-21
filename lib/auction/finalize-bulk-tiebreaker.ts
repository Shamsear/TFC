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
  console.log(`\n🔍 CHECKING AUTO-FINALIZATION CONDITIONS`);
  console.log(`   Tiebreaker ID: ${tiebreakerId}`);
  
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      teamsRemaining: true,
      startTime: true,
      maxEndTime: true,
      status: true
    }
  });

  if (!tiebreaker) {
    console.log(`   ❌ Tiebreaker not found`);
    return false;
  }

  console.log(`   Status: ${tiebreaker.status}`);
  console.log(`   Teams Remaining: ${tiebreaker.teamsRemaining}`);
  console.log(`   Start Time: ${tiebreaker.startTime?.toISOString() || 'Not started'}`);
  console.log(`   Max End Time: ${tiebreaker.maxEndTime?.toISOString() || 'Not set'}`);

  // Condition 1: Only 1 team remaining
  if (tiebreaker.teamsRemaining === 1) {
    console.log(`   ✅ CONDITION MET: Only 1 team remaining`);
    return true;
  } else {
    console.log(`   ❌ Condition 1 not met: ${tiebreaker.teamsRemaining} teams remaining (need exactly 1)`);
  }

  // Condition 2: 24 hours elapsed
  if (tiebreaker.maxEndTime) {
    const now = new Date();
    const timeRemaining = tiebreaker.maxEndTime.getTime() - now.getTime();
    console.log(`   Current Time: ${now.toISOString()}`);
    console.log(`   Time Remaining: ${Math.floor(timeRemaining / 1000)}s`);
    
    if (now >= tiebreaker.maxEndTime) {
      console.log(`   ✅ CONDITION MET: Time expired`);
      return true;
    } else {
      console.log(`   ❌ Condition 2 not met: Time not expired yet`);
    }
  } else {
    console.log(`   ❌ Condition 2 not met: No max end time set`);
  }

  console.log(`   ❌ RESULT: Should NOT auto-finalize\n`);
  return false;
}

/**
 * Finalize bulk tiebreaker
 */
export async function finalizeBulkTiebreaker(
  tiebreakerId: number
): Promise<BulkTiebreakerResult> {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 BULK TIEBREAKER FINALIZATION STARTED`);
    console.log(`   Tiebreaker ID: ${tiebreakerId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Get tiebreaker details
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: {
        status: true,
        currentHighestBid: true,
        currentHighestTeamId: true,
        teamsRemaining: true,
        basePrice: true,
        startTime: true,
        maxEndTime: true,
        participants: {
          where: { status: 'active' },
          select: {
            teamId: true,
            currentBid: true,
            status: true
          }
        }
      }
    });

    if (!tiebreaker) {
      console.log(`❌ ERROR: Tiebreaker ${tiebreakerId} not found in database`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: false, error: 'Tiebreaker not found' };
    }

    console.log(`📊 TIEBREAKER STATE:`);
    console.log(`   Status: ${tiebreaker.status}`);
    console.log(`   Teams Remaining: ${tiebreaker.teamsRemaining}`);
    console.log(`   Current Highest Bid: £${tiebreaker.currentHighestBid || 'None'}`);
    console.log(`   Current Highest Team: ${tiebreaker.currentHighestTeamId || 'None'}`);
    console.log(`   Base Price: £${tiebreaker.basePrice}`);
    console.log(`   Start Time: ${tiebreaker.startTime?.toISOString() || 'Not started'}`);
    console.log(`   Max End Time: ${tiebreaker.maxEndTime?.toISOString() || 'Not set'}`);
    console.log(`\n📊 ACTIVE PARTICIPANTS (${tiebreaker.participants.length}):`);
    tiebreaker.participants.forEach((p, i) => {
      console.log(`   ${i + 1}. Team: ${p.teamId}, Bid: £${p.currentBid || 'None'}, Status: ${p.status}`);
    });

    if (tiebreaker.status !== 'active') {
      console.log(`\n❌ FINALIZATION ABORTED: Tiebreaker not active`);
      console.log(`   Current status: ${tiebreaker.status}`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: false, error: 'Tiebreaker already finalized' };
    }

    // Check if should auto-finalize
    console.log(`\n🔍 CHECKING FINALIZATION CONDITIONS...`);
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    console.log(`   Result: ${shouldFinalize ? '✅ YES' : '❌ NO'}`);
    
    if (!shouldFinalize) {
      console.log(`\n❌ FINALIZATION ABORTED: Conditions not met`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: false, error: 'Tiebreaker not ready to finalize' };
    }

    // Determine winner
    console.log(`\n🏆 DETERMINING WINNER...`);
    let winnerId: string | null = null;
    let winningBid: number | null = null;

    if (tiebreaker.teamsRemaining === 1) {
      console.log(`   Condition: Only 1 team remaining (Last Person Standing)`);
      
      // Only 1 team remaining - they win with their current bid (or highest bid)
      const activeParticipant = tiebreaker.participants[0]; // Should only be 1 active
      
      if (activeParticipant) {
        winnerId = activeParticipant.teamId;
        // Use their current bid, or fall back to the tiebreaker's highest bid
        winningBid = activeParticipant.currentBid || tiebreaker.currentHighestBid;
        console.log(`   ✅ Winner Found: ${winnerId}`);
        console.log(`   💰 Winning Bid: £${winningBid}`);
        console.log(`   📝 Source: Active participant record`);
      } else {
        console.log(`   ⚠️ WARNING: No active participant found in participants array`);
        console.log(`   🔄 Attempting fallback to highest bidder...`);
        // Fallback: use the highest bidder from the tiebreaker
        if (tiebreaker.currentHighestTeamId && tiebreaker.currentHighestBid) {
          winnerId = tiebreaker.currentHighestTeamId;
          winningBid = tiebreaker.currentHighestBid;
          console.log(`   ✅ Winner Found (Fallback): ${winnerId}`);
          console.log(`   💰 Winning Bid: £${winningBid}`);
          console.log(`   📝 Source: Tiebreaker highest bid record`);
        } else {
          console.log(`   ❌ ERROR: No highest bidder information available`);
        }
      }
    } else if (tiebreaker.currentHighestTeamId && tiebreaker.currentHighestBid) {
      console.log(`   Condition: Time expired (24 hours elapsed)`);
      // 24 hours elapsed - highest bidder wins
      winnerId = tiebreaker.currentHighestTeamId;
      winningBid = tiebreaker.currentHighestBid;
      console.log(`   ✅ Winner Found: ${winnerId}`);
      console.log(`   💰 Winning Bid: £${winningBid}`);
      console.log(`   📝 Source: Highest bidder at time expiry`);
    }

    if (!winnerId || !winningBid) {
      console.log(`\n❌ FINALIZATION FAILED: No valid winner determined`);
      console.log(`   Winner ID: ${winnerId || 'null'}`);
      console.log(`   Winning Bid: ${winningBid || 'null'}`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: false, error: 'No valid winner found' };
    }

    // Update tiebreaker status
    console.log(`\n💾 UPDATING DATABASE...`);
    console.log(`   Setting status to: completed`);
    console.log(`   Setting winner to: ${winnerId}`);
    console.log(`   Setting winning bid to: £${winningBid}`);
    
    await prisma.bulk_tiebreakers.update({
      where: { id: tiebreakerId },
      data: {
        status: 'completed',
        currentHighestTeamId: winnerId,
        currentHighestBid: winningBid
      }
    });
    console.log(`   ✅ Database updated successfully`);

    console.log(`\n📡 EMITTING SSE EVENT...`);
    try {
      const { emitTiebreakerChange } = await import('./tiebreaker-events');
      await emitTiebreakerChange(tiebreakerId);
      console.log(`   ✅ SSE event emitted successfully`);
    } catch (e) {
      console.error(`   ❌ ERROR emitting SSE event:`, e);
    }

    console.log(`\n✅ BULK TIEBREAKER FINALIZATION COMPLETED SUCCESSFULLY`);
    console.log(`   Winner: ${winnerId}`);
    console.log(`   Winning Bid: £${winningBid}`);
    console.log(`${'='.repeat(60)}\n`);
    
    return {
      success: true,
      winnerId,
      winningBid
    };
  } catch (error) {
    console.log(`\n❌ BULK TIEBREAKER FINALIZATION EXCEPTION`);
    console.error(`   Error:`, error);
    console.log(`${'='.repeat(60)}\n`);
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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`💰 APPLYING BULK TIEBREAKER RESULT`);
  console.log(`   Tiebreaker ID: ${tiebreakerId}`);
  console.log(`   Winner: ${winnerId}`);
  console.log(`   Winning Bid: £${winningBid}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

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
    console.log(`❌ ERROR: Tiebreaker not found`);
    console.log(`${'='.repeat(60)}\n`);
    throw new Error('Tiebreaker not found');
  }

  console.log(`📊 TIEBREAKER INFO:`);
  console.log(`   Player: ${tiebreaker.basePlayer.name}`);
  console.log(`   Player ID: ${tiebreaker.basePlayerId}`);
  console.log(`   Round ID: ${tiebreaker.roundId}`);

  // Get season from round
  const round = await prisma.rounds.findUnique({
    where: { id: tiebreaker.roundId },
    select: { seasonId: true }
  });

  if (!round) {
    console.log(`❌ ERROR: Round not found`);
    console.log(`${'='.repeat(60)}\n`);
    throw new Error('Round not found');
  }

  console.log(`   Season ID: ${round.seasonId}`);

  // Pre-generate IDs outside transaction
  const transferId = await generateTransferId();
  const ledgerId = await generateFinancialId();
  
  console.log(`\n🔑 GENERATED IDs:`);
  console.log(`   Transfer ID: ${transferId}`);
  console.log(`   Ledger ID: ${ledgerId}`);

  console.log(`\n💾 STARTING DATABASE TRANSACTION...`);
  
  await prisma.$transaction(async (tx) => {
    // 1. Create transfer history
    console.log(`   1️⃣ Creating transfer history record...`);
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
    console.log(`      ✅ Transfer history created`);

    // 2. Update team budget
    console.log(`   2️⃣ Fetching team budget...`);
    const seasonTeam = await tx.season_teams.findUnique({
      where: {
        seasonId_teamId: {
          seasonId: round.seasonId,
          teamId: winnerId
        }
      }
    });

    if (seasonTeam) {
      const previousBudget = seasonTeam.currentBudget;
      const newBudget = seasonTeam.currentBudget - winningBid;
      
      console.log(`      Previous Budget: £${previousBudget}`);
      console.log(`      Deducting: £${winningBid}`);
      console.log(`      New Budget: £${newBudget}`);

      console.log(`   3️⃣ Updating team budget...`);
      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: round.seasonId,
            teamId: winnerId
          }
        },
        data: { currentBudget: newBudget }
      });
      console.log(`      ✅ Budget updated`);

      // 3. Insert financial ledger entry
      console.log(`   4️⃣ Creating financial ledger entry...`);
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
      console.log(`      ✅ Ledger entry created`);
    } else {
      console.log(`      ⚠️ WARNING: Season team not found for ${winnerId}`);
    }
  }, {
    timeout: 10000 // 10 second timeout
  });
  
  console.log(`\n✅ TRANSACTION COMPLETED SUCCESSFULLY`);
  console.log(`   Player ${tiebreaker.basePlayer.name} assigned to team ${winnerId}`);
  console.log(`   Amount deducted: £${winningBid}`);
  console.log(`${'='.repeat(60)}\n`);
}

/**
 * Process team withdrawal from bulk tiebreaker
 */
export async function withdrawFromBulkTiebreaker(
  tiebreakerId: number,
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚪 BULK TIEBREAKER WITHDRAWAL INITIATED`);
    console.log(`   Tiebreaker ID: ${tiebreakerId}`);
    console.log(`   Team ID: ${teamId}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Check if team is the highest bidder
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: { 
        currentHighestTeamId: true,
        status: true,
        teamsRemaining: true
      }
    });

    if (!tiebreaker) {
      console.log(`❌ ERROR: Tiebreaker not found\n`);
      return { success: false, error: 'Tiebreaker not found' };
    }

    console.log(`📊 CURRENT STATE:`);
    console.log(`   Status: ${tiebreaker.status}`);
    console.log(`   Teams Remaining: ${tiebreaker.teamsRemaining}`);
    console.log(`   Highest Bidder: ${tiebreaker.currentHighestTeamId || 'None'}`);

    if (tiebreaker.status !== 'active') {
      console.log(`\n❌ ERROR: Tiebreaker is not active\n`);
      return { success: false, error: 'Tiebreaker is not active' };
    }

    if (tiebreaker.currentHighestTeamId === teamId) {
      console.log(`\n❌ ERROR: Cannot withdraw - team has highest bid\n`);
      return { 
        success: false, 
        error: 'Cannot withdraw while you have the highest bid. Wait to be outbid first.' 
      };
    }

    console.log(`\n💾 STARTING WITHDRAWAL TRANSACTION...`);
    await prisma.$transaction(async (tx) => {
      // Update participant status
      console.log(`   1️⃣ Updating participant status to 'withdrawn'...`);
      await tx.bulk_tiebreaker_participants.updateMany({
        where: {
          tiebreakerId,
          teamId
        },
        data: {
          status: 'withdrawn'
        }
      });
      console.log(`      ✅ Participant status updated`);

      // Decrement teams remaining
      const tiebreaker = await tx.bulk_tiebreakers.findUnique({
        where: { id: tiebreakerId },
        select: { teamsRemaining: true }
      });

      if (tiebreaker) {
        const newTeamsRemaining = Math.max(0, tiebreaker.teamsRemaining - 1);
        console.log(`   2️⃣ Decrementing teams remaining...`);
        console.log(`      Previous: ${tiebreaker.teamsRemaining}`);
        console.log(`      New: ${newTeamsRemaining}`);
        
        await tx.bulk_tiebreakers.update({
          where: { id: tiebreakerId },
          data: {
            teamsRemaining: newTeamsRemaining
          }
        });
        console.log(`      ✅ Teams remaining updated`);
      }
    }, {
      timeout: 15000, // 15 second timeout
      maxWait: 10000  // Wait max 10 seconds to acquire connection
    });

    console.log(`\n✅ TRANSACTION COMPLETED`);

    // Small delay to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if should auto-finalize
    console.log(`\n🔍 Checking auto-finalization after withdrawal...`);
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    
    if (shouldFinalize) {
      console.log(`\n🎯 AUTO-FINALIZATION TRIGGERED`);
      const result = await finalizeBulkTiebreaker(tiebreakerId);
      console.log(`📊 Finalization result:`, result);
      
      if (result.success && result.winnerId && result.winningBid) {
        console.log(`\n💰 APPLYING TIEBREAKER RESULT...`);
        await applyBulkTiebreakerResult(tiebreakerId, result.winnerId, result.winningBid);
        console.log(`✅ Tiebreaker ${tiebreakerId} finalized and applied successfully!`);
      }
    } else {
      console.log(`\n📊 Auto-finalization not needed - tiebreaker continues`);
    }

    console.log(`\n📡 EMITTING SSE EVENT...`);
    try {
      const { emitTiebreakerChange } = await import('./tiebreaker-events');
      await emitTiebreakerChange(tiebreakerId);
      console.log(`✅ SSE event emitted`);
    } catch (e) {
      console.error('❌ Error emitting tiebreaker change event:', e);
    }

    console.log(`\n✅ WITHDRAWAL COMPLETED SUCCESSFULLY`);
    console.log(`${'='.repeat(60)}\n`);
    return { success: true };
  } catch (error) {
    console.log(`\n❌ WITHDRAWAL EXCEPTION`);
    console.error('Error:', error);
    console.log(`${'='.repeat(60)}\n`);
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
        roundId: true,
        teamsRemaining: true
      }
    });

    if (!tiebreaker) {
      return { success: false, error: 'Tiebreaker not found' };
    }

    if (tiebreaker.status !== 'active') {
      return { success: false, error: 'Tiebreaker is not active' };
    }

    // Check if only one team remains - should not be able to bid
    if (tiebreaker.teamsRemaining === 1) {
      console.log(`🎯 Only 1 team remaining in tiebreaker ${tiebreakerId} - auto-finalizing instead of accepting bid...`);
      
      // Auto-finalize the tiebreaker
      const finalizeResult = await finalizeBulkTiebreaker(tiebreakerId);
      
      if (finalizeResult.success && finalizeResult.winnerId && finalizeResult.winningBid) {
        await applyBulkTiebreakerResult(tiebreakerId, finalizeResult.winnerId, finalizeResult.winningBid);
        
        // Emit change after finalization
        try {
          const { emitTiebreakerChange } = await import('./tiebreaker-events');
          await emitTiebreakerChange(tiebreakerId);
        } catch (e) {
          console.error('Error emitting tiebreaker change event after auto-finalization:', e);
        }
        
        return { 
          success: false, 
          error: 'You are the only team remaining. The tiebreaker has been automatically finalized and the player has been assigned to you.' 
        };
      }
      
      return { 
        success: false, 
        error: 'You are the only team remaining. Cannot place additional bids.' 
      };
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
      const { emitTiebreakerChange } = await import('./tiebreaker-events');
      await emitTiebreakerChange(tiebreakerId);
    } catch (e) {
      console.error('Error emitting tiebreaker change event on bid:', e);
    }
    
    // Check if should auto-finalize after bid (e.g., if this team is now the only one left)
    console.log(`🔍 Checking auto-finalization after bid for tiebreaker ${tiebreakerId}...`);
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    console.log(`📊 Should finalize: ${shouldFinalize}`);
    
    if (shouldFinalize) {
      console.log(`🎯 Auto-finalizing tiebreaker ${tiebreakerId} after bid...`);
      const finalizeResult = await finalizeBulkTiebreaker(tiebreakerId);
      console.log(`📊 Finalization result:`, finalizeResult);
      
      if (finalizeResult.success && finalizeResult.winnerId && finalizeResult.winningBid) {
        console.log(`💰 Applying result: Winner=${finalizeResult.winnerId}, Bid=£${finalizeResult.winningBid}`);
        await applyBulkTiebreakerResult(tiebreakerId, finalizeResult.winnerId, finalizeResult.winningBid);
        console.log(`✅ Tiebreaker ${tiebreakerId} finalized successfully after bid!`);
        
        // Emit change again after finalization
        try {
          const { emitTiebreakerChange } = await import('./tiebreaker-events');
          await emitTiebreakerChange(tiebreakerId);
        } catch (e) {
          console.error('Error emitting tiebreaker change event after finalization:', e);
        }
      }
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
