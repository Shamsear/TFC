import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  const roundId = 'TFCR-36';

  console.log(`\n================================================================================`);
  console.log(`🧹 REMOVING ASSIGNED PLAYERS & REVERTING ROUND: ${roundId}`);
  console.log(`================================================================================\n`);

  const round = await prisma.rounds.findUnique({
    where: { id: roundId }
  });

  if (!round) {
    console.error(`❌ Round ${roundId} not found.`);
    process.exit(1);
  }

  // 1. Fetch all transfers created by TFCR-36
  const transfers = await prisma.transfer_history.findMany({
    where: { roundId },
    include: {
      basePlayer: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } }
    }
  });

  console.log(`📋 Found ${transfers.length} assigned player transfer(s) for ${roundId}:`);
  for (const t of transfers) {
    console.log(`   - ${t.basePlayer.name} -> ${t.team.name} (£${t.soldPrice}) [Type: ${t.acquisitionType}]`);
  }

  // Calculate refund amounts per team
  const teamRefundsMap = new Map<string, number>();
  for (const t of transfers) {
    const currentRefund = teamRefundsMap.get(t.teamId) || 0;
    teamRefundsMap.set(t.teamId, currentRefund + t.soldPrice);
  }

  // 2. Fetch financial ledger entries
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

  console.log(`\n🔄 Executing transaction to delete transfers, refund budgets, and reset round...`);

  await prisma.$transaction(async (tx) => {
    // A. Delete transfers
    const deletedTransfers = await tx.transfer_history.deleteMany({
      where: { roundId }
    });

    // B. Restore team budgets
    for (const [teamId, refundAmount] of teamRefundsMap.entries()) {
      const seasonTeam = await tx.season_teams.findUnique({
        where: { seasonId_teamId: { seasonId: round.seasonId, teamId } }
      });

      if (seasonTeam) {
        await tx.season_teams.update({
          where: { id: seasonTeam.id },
          data: { currentBudget: { increment: refundAmount } }
        });
      }
    }

    // C. Delete financial ledger entries
    if (ledgerIdsToDelete.length > 0) {
      await tx.financial_ledger.deleteMany({
        where: { id: { in: ledgerIdsToDelete } }
      });
    }

    // D. Delete tiebreakers & bulk tiebreakers
    await tx.tiebreakers.deleteMany({ where: { roundId } });
    await tx.bulk_tiebreakers.deleteMany({ where: { roundId } });
    await tx.preview_allocations.deleteMany({ where: { roundId } });

    // E. Delete team bids
    await tx.team_round_bids.deleteMany({ where: { roundId } });
    await tx.bulk_round_selections.deleteMany({ where: { roundId } });

    // F. Reset round to draft
    await tx.rounds.update({
      where: { id: roundId },
      data: {
        status: 'draft',
        startTime: null,
        endTime: null,
        finalizationState: Prisma.JsonNull
      }
    });
  }, {
    timeout: 30000
  });

  console.log(`\n✅ SUCCESSFULLY REMOVED ALL ${transfers.length} ASSIGNED PLAYERS!`);
  console.log(`   - Deleted Transfers: ${transfers.length}`);
  console.log(`   - Deleted Ledger Entries: ${ledgerIdsToDelete.length}`);
  console.log(`   - Refunded ${teamRefundsMap.size} teams (£10 each)`);
  console.log(`   - Cleared Bids & Reset Status: draft (start/end times set to null)\n`);
}

main()
  .catch(e => {
    console.error('❌ Error executing script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
