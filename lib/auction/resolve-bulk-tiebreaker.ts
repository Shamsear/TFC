import { prisma } from '@/lib/prisma';
import { generateTransferId, generateFinancialId, generateAuditId } from '@/lib/id-generator';

/**
 * Automatically resolve bulk tiebreaker when all teams have submitted sealed bids
 * Similar to normal tiebreaker resolution
 */
export async function resolveBulkTiebreaker(tiebreakerId: number) {
  console.log(`🔄 Auto-resolving bulk tiebreaker ${tiebreakerId}...`);

  try {
    // Get tiebreaker with all participants
    const tiebreaker = await prisma.bulk_tiebreakers.findUnique({
      where: { id: tiebreakerId },
      include: {
        basePlayer: true,
        round: {
          include: {
            season: true
          }
        },
        participants: {
          where: {
            status: 'active',
            submitted: true
          },
          include: {
            team: true
          }
        }
      }
    });

    if (!tiebreaker) {
      throw new Error('Tiebreaker not found');
    }

    if (tiebreaker.status !== 'active') {
      console.log(`⚠️  Tiebreaker ${tiebreakerId} is not active (status: ${tiebreaker.status})`);
      return { success: false, error: 'Tiebreaker is not active' };
    }

    // Check all active participants have submitted
    const allActiveParticipants = await prisma.bulk_tiebreaker_participants.findMany({
      where: {
        tiebreakerId,
        status: 'active'
      }
    });

    const allSubmitted = allActiveParticipants.every(p => p.submitted);
    if (!allSubmitted) {
      console.log(`⚠️  Not all participants have submitted for tiebreaker ${tiebreakerId}`);
      return { success: false, error: 'Not all participants have submitted' };
    }

    // Find highest bid
    const validBids = tiebreaker.participants.filter(p => p.newBidAmount && p.newBidAmount > tiebreaker.basePrice);
    
    if (validBids.length === 0) {
      console.log(`⚠️  No valid bids for tiebreaker ${tiebreakerId}`);
      // Mark as completed with no winner
      await prisma.bulk_tiebreakers.update({
        where: { id: tiebreakerId },
        data: {
          status: 'completed',
          currentHighestBid: null,
          currentHighestTeamId: null
        }
      });
      return { success: true, winner: null, message: 'No valid bids' };
    }

    // Sort by bid amount (highest first), then by submission time (earliest first) for tiebreaks
    validBids.sort((a, b) => {
      if (b.newBidAmount! !== a.newBidAmount!) {
        return b.newBidAmount! - a.newBidAmount!;
      }
      // If bids are equal, earliest submission wins
      return (a.submittedAt?.getTime() || 0) - (b.submittedAt?.getTime() || 0);
    });

    const winner = validBids[0];
    const winningBid = winner.newBidAmount!;

    console.log(`✅ Winner: ${winner.team.name} with bid £${winningBid.toLocaleString()}`);

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update tiebreaker status
      await tx.bulk_tiebreakers.update({
        where: { id: tiebreakerId },
        data: {
          status: 'completed',
          currentHighestBid: winningBid,
          currentHighestTeamId: winner.teamId,
          teamsRemaining: 1
        }
      });

      // Create transfer record
      const transferId = await generateTransferId();
      await tx.transfer_history.create({
        data: {
          id: transferId,
          basePlayerId: tiebreaker.basePlayer.id,
          seasonId: tiebreaker.round.seasonId,
          teamId: winner.teamId,
          soldPrice: winningBid,
          roundId: tiebreaker.roundId,
          status: 'ACTIVE',
          acquisitionType: 'BULK_TIEBREAKER'
        }
      });

      // Get season team for budget update
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winner.teamId
          }
        }
      });

      if (!seasonTeam) {
        throw new Error('Season team not found');
      }

      const previousBudget = seasonTeam.currentBudget;
      const newBudget = seasonTeam.currentBudget - winningBid;

      // Update team budget
      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: tiebreaker.round.seasonId,
            teamId: winner.teamId
          }
        },
        data: { currentBudget: newBudget }
      });

      // Create financial ledger entry
      const financialId = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: financialId,
          seasonTeamId: seasonTeam.id,
          seasonId: tiebreaker.round.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -winningBid,
          previousBalance: previousBudget,
          newBalance: newBudget,
          description: `Bulk tiebreaker ${tiebreakerId} - Auto-resolved: ${tiebreaker.basePlayer.name}`,
          playerName: tiebreaker.basePlayer.name
        }
      });

      // Create audit log
      const auditId = await generateAuditId();
      await tx.audit_logs.create({
        data: {
          id: auditId,
          userId: 'SYSTEM',
          userEmail: 'system@turfcats.com',
          userRole: 'SYSTEM',
          action: 'BULK_TIEBREAKER_AUTO_RESOLVE',
          entityType: 'bulk_tiebreaker',
          entityId: tiebreakerId.toString(),
          seasonId: tiebreaker.round.seasonId,
          details: JSON.stringify({
            tiebreakerId,
            playerId: tiebreaker.basePlayer.id,
            playerName: tiebreaker.basePlayer.name,
            winnerId: winner.teamId,
            winnerName: winner.team.name,
            winningBid,
            allBids: validBids.map(b => ({
              teamId: b.teamId,
              teamName: b.team.name,
              bidAmount: b.newBidAmount,
              submittedAt: b.submittedAt
            }))
          })
        }
      });
    });

    console.log(`✅ Bulk tiebreaker ${tiebreakerId} auto-resolved successfully`);
    return {
      success: true,
      winner: {
        teamId: winner.teamId,
        teamName: winner.team.name,
        bidAmount: winningBid
      }
    };

  } catch (error) {
    console.error(`❌ Error auto-resolving bulk tiebreaker ${tiebreakerId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
