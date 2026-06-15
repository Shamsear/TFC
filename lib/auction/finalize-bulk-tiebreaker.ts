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
 * For sealed bid model: auto-finalize when all active teams have submitted
 */
export async function shouldAutoFinalizeBulkTiebreaker(
  tiebreakerId: number
): Promise<boolean> {
  console.log(`\n🔍 CHECKING AUTO-FINALIZATION CONDITIONS (SEALED BID MODEL)`);
  console.log(`   Tiebreaker ID: ${tiebreakerId}`);
  
  const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
    where: { id: tiebreakerId },
    select: {
      teamsRemaining: true,
      startTime: true,
      maxEndTime: true,
      status: true,
      participants: {
        where: { status: 'active' },
        select: {
          submitted: true
        }
      }
    }
  });

  if (!tiebreaker) {
    console.log(`   ❌ Tiebreaker not found`);
    return false;
  }

  console.log(`   Status: ${tiebreaker.status}`);
  console.log(`   Teams Remaining: ${tiebreaker.teamsRemaining}`);
  console.log(`   Active Participants: ${tiebreaker.participants.length}`);
  console.log(`   Start Time: ${tiebreaker.startTime?.toISOString() || 'Not started'}`);
  console.log(`   Max End Time: ${tiebreaker.maxEndTime?.toISOString() || 'Not set'}`);

  // Sealed Bid Model: Check if all active participants have submitted
  const allSubmitted = tiebreaker.participants.every(p => p.submitted);
  const submittedCount = tiebreaker.participants.filter(p => p.submitted).length;
  
  console.log(`   Submitted: ${submittedCount} / ${tiebreaker.participants.length}`);
  
  if (allSubmitted && tiebreaker.participants.length > 0) {
    console.log(`   ✅ CONDITION MET: All active teams have submitted sealed bids`);
    return true;
  } else {
    console.log(`   ❌ Condition not met: Not all teams have submitted (${submittedCount}/${tiebreaker.participants.length})`);
  }

  // Fallback: Time expired (24 hours)
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
        roundId: true,
        basePlayerId: true,
        participants: {
          where: { status: 'active' },
          select: {
            teamId: true,
            newBidAmount: true,
            submitted: true,
            submittedAt: true,
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
      console.log(`   ${i + 1}. Team: ${p.teamId}, Sealed Bid: £${p.newBidAmount || 'Not submitted'}, Submitted: ${p.submitted}, Status: ${p.status}`);
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

    // Determine winner (Sealed Bid Model)
    console.log(`\n🏆 DETERMINING WINNER (SEALED BID MODEL)...`);
    let winnerId: string | null = null;
    let winningBid: number | null = null;

    // Find all valid sealed bids
    const validBids = tiebreaker.participants.filter(
      p => p.submitted && p.newBidAmount && p.newBidAmount > tiebreaker.basePrice
    );

    console.log(`   Valid sealed bids: ${validBids.length}`);
    
    if (validBids.length === 0) {
      console.log(`   ⚠️ No valid sealed bids found`);
      console.log(`\n❌ FINALIZATION FAILED: No valid bids`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: false, error: 'No valid bids submitted' };
    }

    // Sort by bid amount (highest first)
    validBids.sort((a, b) => b.newBidAmount! - a.newBidAmount!);

    // Check for a tie at the highest bid
    const highestBid = validBids[0].newBidAmount!;
    const tiedBids = validBids.filter(b => b.newBidAmount === highestBid);

    if (tiedBids.length > 1) {
      console.log(`   ⚖️ Tie detected! ${tiedBids.length} teams bid £${highestBid}`);
      
      // We will create a new tiebreaker for the tied teams
      let newTiebreakerId: number | undefined;

      await prisma.$transaction(async (tx) => {
        // Mark current as completed with no winner
        await tx.bulk_tiebreakers.update({
          where: { id: tiebreakerId },
          data: {
            status: 'completed',
            currentHighestBid: highestBid,
            currentHighestTeamId: null,
            teamsRemaining: tiedBids.length
          }
        });

        const now = new Date();
        const maxEndTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Create new bulk tiebreaker
        const newTiebreaker = await tx.bulk_tiebreakers.create({
          data: {
            roundId: tiebreaker.roundId,
            basePlayerId: tiebreaker.basePlayerId,
            basePrice: highestBid,
            status: 'active',
            teamsRemaining: tiedBids.length,
            startTime: now,
            maxEndTime: maxEndTime
          }
        });
        newTiebreakerId = newTiebreaker.id;

        // Create participants for the new tiebreaker
        for (const bid of tiedBids) {
          await tx.bulk_tiebreaker_participants.create({
            data: {
              tiebreakerId: newTiebreaker.id,
              teamId: bid.teamId,
              status: 'active',
              submitted: false
            }
          });
        }
      });

      console.log(`   ✅ New tiebreaker ${newTiebreakerId} created for the tied teams`);
      return { 
        success: true, 
        error: 'Another tie detected. New tiebreaker created.' 
      };
    }

    const winner = validBids[0];
    winnerId = winner.teamId;
    winningBid = winner.newBidAmount!;

    console.log(`   ✅ Winner Found: ${winnerId}`);
    console.log(`   💰 Winning Bid: £${winningBid}`);
    console.log(`   📝 Submission Time: ${winner.submittedAt?.toISOString() || 'Unknown'}`);
    
    if (validBids.length > 1 && validBids[1].newBidAmount === winningBid) {
      console.log(`   ⚖️ Tiebreaker applied: Multiple teams bid £${winningBid}, earliest submission wins`);
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
    // Check if ACTIVE transfer already exists
    console.log(`   🔍 Checking for existing transfer...`);
    const existingTransfer = await tx.transfer_history.findFirst({
      where: {
        basePlayerId: tiebreaker.basePlayerId,
        seasonId: round.seasonId,
        teamId: winnerId,
        status: 'ACTIVE'
      }
    });
    
    if (existingTransfer) {
      console.warn(`      ⚠️  Transfer already exists for player ${tiebreaker.basePlayerId} to team ${winnerId}, skipping creation`);
    } else {
      // 1. Create transfer history
      console.log(`   1️⃣ Creating transfer history record...`);
      await tx.transfer_history.create({
        data: {
          id: transferId,
          basePlayerId: tiebreaker.basePlayerId,
          seasonId: round.seasonId,
          teamId: winnerId,
          soldPrice: winningBid,
          roundId: tiebreaker.roundId,
          status: 'ACTIVE'
        }
      });
      console.log(`      ✅ Transfer history created`);
    }

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

      // 3. Check for existing ledger entry to prevent duplicates
      console.log(`   🔍 Checking for existing ledger entry...`);
      const existingLedger = await tx.financial_ledger.findFirst({
        where: {
          seasonTeamId: seasonTeam.id,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          description: `Bulk tiebreaker ${tiebreakerId} - Player purchase`
        }
      });
      
      if (existingLedger) {
        console.warn(`      ⚠️  Ledger entry already exists for tiebreaker ${tiebreakerId}, skipping`);
      } else {
        // Insert financial ledger entry
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
      }
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
 * Updated for sealed bid model
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

    // Check tiebreaker status and if team has submitted
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      select: { 
        status: true,
        teamsRemaining: true,
        participants: {
          where: { teamId },
          select: {
            submitted: true
          }
        }
      }
    });

    if (!tiebreaker) {
      console.log(`❌ ERROR: Tiebreaker not found\n`);
      return { success: false, error: 'Tiebreaker not found' };
    }

    console.log(`📊 CURRENT STATE:`);
    console.log(`   Status: ${tiebreaker.status}`);
    console.log(`   Teams Remaining: ${tiebreaker.teamsRemaining}`);

    if (tiebreaker.status !== 'active') {
      console.log(`\n❌ ERROR: Tiebreaker is not active\n`);
      return { success: false, error: 'Tiebreaker is not active' };
    }

    // Sealed bid model: Cannot withdraw after submission
    const participant = tiebreaker.participants[0];
    if (participant?.submitted) {
      console.log(`\n❌ ERROR: Cannot withdraw after submitting sealed bid\n`);
      return { 
        success: false, 
        error: 'Cannot withdraw after submitting your bid' 
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
      timeout: 15000,
      maxWait: 10000
    });

    console.log(`\n✅ TRANSACTION COMPLETED`);

    // Small delay to ensure transaction is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if should auto-finalize (sealed bid model checks if all submitted)
    console.log(`\n🔍 Checking auto-finalization after withdrawal...`);
    const shouldFinalize = await shouldAutoFinalizeBulkTiebreaker(tiebreakerId);
    
    if (shouldFinalize) {
      console.log(`\n🎯 AUTO-FINALIZATION TRIGGERED`);
      // Use the sealed bid resolution function
      const { resolveBulkTiebreaker } = await import('./resolve-bulk-tiebreaker');
      const result = await resolveBulkTiebreaker(tiebreakerId);
      console.log(`📊 Resolution result:`, result);
    } else {
      console.log(`\n📊 Auto-finalization not needed - tiebreaker continues`);
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
