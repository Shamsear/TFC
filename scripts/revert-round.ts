import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Script to revert a round completely.
 * Usage: npx tsx scripts/revert-round.ts <roundId> [--reset-bids] [--status=draft|active]
 * 
 * Example:
 * npx tsx scripts/revert-round.ts TFCR-30
 * npx tsx scripts/revert-round.ts TFCR-30 --reset-bids
 */
async function main() {
  const args = process.argv.slice(2);
  const roundId = args.find(arg => !arg.startsWith('--'));
  const resetBids = args.includes('--reset-bids');
  const targetStatusArg = args.find(arg => arg.startsWith('--status='));
  const targetStatus = targetStatusArg ? (targetStatusArg.split('=')[1] as 'active' | 'draft') : 'active';

  if (!roundId) {
    console.error('❌ Error: Please provide a roundId.');
    console.log('Usage: npx tsx scripts/revert-round.ts <roundId> [--reset-bids] [--status=draft|active]');
    process.exit(1);
  }

  console.log(`\n================================================================================`);
  console.log(`🔄 REVERTING ROUND: ${roundId}`);
  console.log(`- Reset Bids: ${resetBids}`);
  console.log(`- Target Status: ${targetStatus}`);
  console.log(`================================================================================\n`);

  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  });

  if (!round) {
    console.error(`❌ Round ${roundId} not found.`);
    process.exit(1);
  }

  // 1. Fetch transfers created by this round
  const transfers = await prisma.transfer_history.findMany({
    where: { roundId }
  });

  const teamRefundsMap = new Map<string, number>();
  for (const t of transfers) {
    const currentRefund = teamRefundsMap.get(t.teamId) || 0;
    teamRefundsMap.set(t.teamId, currentRefund + t.soldPrice);
  }

  // 2. Fetch financial ledger entries created for this round
  const ledgerEntries = await prisma.financial_ledger.findMany({
    where: {
      seasonId: round.seasonId,
      OR: [
        { description: { contains: roundId } },
        { description: { contains: `Round ${round.roundNumber}` } }
      ]
    }
  });
  const ledgerIdsToDelete = ledgerEntries.map(l => l.id);

  // 3. Fetch bulk tiebreakers
  const bulkTiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: { roundId },
    select: { id: true }
  });
  const bulkTiebreakerIds = bulkTiebreakers.map(bt => bt.id);

  console.log(`📋 Found items to revert/delete:`);
  console.log(`   - Transfers: ${transfers.length}`);
  console.log(`   - Ledger Entries: ${ledgerEntries.length}`);
  console.log(`   - Bulk Tiebreakers: ${bulkTiebreakers.length}`);
  console.log(`   - Teams affected (to refund): ${teamRefundsMap.size}`);

  // Revert transaction
  const revertSummary = await prisma.$transaction(async (tx) => {
    // Delete transfers
    const deletedTransfers = await tx.transfer_history.deleteMany({
      where: { roundId }
    });

    // Refund team budgets
    const budgetUpdates: Array<{ teamId: string; refundedAmount: number }> = [];
    for (const [teamId, refundAmount] of teamRefundsMap.entries()) {
      const seasonTeam = await tx.season_teams.findUnique({
        where: { seasonId_teamId: { seasonId: round.seasonId, teamId } }
      });

      if (seasonTeam) {
        await tx.season_teams.update({
          where: { id: seasonTeam.id },
          data: { currentBudget: { increment: refundAmount } }
        });
        budgetUpdates.push({ teamId, refundedAmount: refundAmount });
      }
    }

    // Delete ledger entries
    let deletedLedgerCount = 0;
    if (ledgerIdsToDelete.length > 0) {
      const res = await tx.financial_ledger.deleteMany({
        where: { id: { in: ledgerIdsToDelete } }
      });
      deletedLedgerCount = res.count;
    }

    // Delete tiebreakers
    const deletedTiebreakers = await tx.tiebreakers.deleteMany({
      where: { roundId }
    });

    // Delete bulk tiebreakers
    let deletedBulkTiebreakersCount = 0;
    if (bulkTiebreakerIds.length > 0) {
      const res = await tx.bulk_tiebreakers.deleteMany({
        where: { id: { in: bulkTiebreakerIds } }
      });
      deletedBulkTiebreakersCount = res.count;
    }

    // Delete preview allocations
    const deletedPreviewAllocations = await tx.preview_allocations.deleteMany({
      where: { roundId }
    });

    // Delete bids if requested
    const deleteBids = args.includes('--delete-bids');
    if (deleteBids) {
      await tx.team_round_bids.deleteMany({ where: { roundId } });
      await tx.bulk_round_selections.deleteMany({ where: { roundId } });
    } else if (resetBids) {
      await tx.team_round_bids.updateMany({
        where: { roundId },
        data: { submitted: false }
      });
      await tx.bulk_round_selections.updateMany({
        where: { roundId },
        data: { submitted: false }
      });
    }

    // Reset round status and timing
    const roundUpdateData: any = {
      status: targetStatus,
      finalizationState: Prisma.JsonNull
    };

    if (targetStatus === 'draft' || args.includes('--clear-dates')) {
      roundUpdateData.startTime = null;
      roundUpdateData.endTime = null;
    }

    const updatedRound = await tx.rounds.update({
      where: { id: roundId },
      data: roundUpdateData
    });

    return {
      deletedTransfersCount: deletedTransfers.count,
      deletedLedgerCount,
      deletedTiebreakersCount: deletedTiebreakers.count,
      deletedBulkTiebreakersCount,
      deletedPreviewAllocationsCount: deletedPreviewAllocations.count,
      budgetRefunds: budgetUpdates,
      newRoundStatus: updatedRound.status
    };
  }, {
    timeout: 30000
  });

  console.log(`\n✅ REVERT COMPLETED SUCCESSFULLY!`);
  console.log(`   - Deleted Transfers: ${revertSummary.deletedTransfersCount}`);
  console.log(`   - Deleted Ledger Entries: ${revertSummary.deletedLedgerCount}`);
  console.log(`   - Deleted Tiebreakers: ${revertSummary.deletedTiebreakersCount}`);
  console.log(`   - Deleted Bulk Tiebreakers: ${revertSummary.deletedBulkTiebreakersCount}`);
  console.log(`   - Deleted Preview Allocations: ${revertSummary.deletedPreviewAllocationsCount}`);
  console.log(`   - Budget Refunds Applied: ${revertSummary.budgetRefunds.length} team(s)`);
  console.log(`   - New Round Status: ${revertSummary.newRoundStatus}\n`);
}

main()
  .catch(e => {
    console.error('❌ Script failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
