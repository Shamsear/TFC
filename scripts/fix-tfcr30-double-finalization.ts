import { prisma } from '../lib/prisma';

/**
 * Cleanup script to fix double finalization of Round TFCR-30 in Season TFCS-5.
 * 
 * 1. Delete Run 2 duplicate transfers (TFCTH-1597 to TFCTH-1628)
 * 2. Delete Run 2 duplicate financial ledger entries (TFCFL-1325 to TFCFL-1356)
 * 3. Recalculate & sync season_teams currentBudget for all teams in TFCS-5
 * 4. Audit team balances to verify 0 discrepancy
 */
async function main() {
  const roundId = 'TFCR-30';
  const seasonId = 'TFCS-5';

  console.log(`\n================================================================================`);
  console.log(`🔧 STARTING TFCR-30 DOUBLE FINALIZATION CLEANUP & BALANCE SYNC`);
  console.log(`================================================================================\n`);

  // Run 2 Transfer IDs: TFCTH-1597 to TFCTH-1628
  const run2TransferIds = [
    'TFCTH-1597', 'TFCTH-1598', 'TFCTH-1599', 'TFCTH-1600', 'TFCTH-1601', 'TFCTH-1602',
    'TFCTH-1603', 'TFCTH-1604', 'TFCTH-1605', 'TFCTH-1606', 'TFCTH-1607', 'TFCTH-1608',
    'TFCTH-1609', 'TFCTH-1610', 'TFCTH-1611', 'TFCTH-1612', 'TFCTH-1613', 'TFCTH-1614',
    'TFCTH-1615', 'TFCTH-1616', 'TFCTH-1617', 'TFCTH-1618', 'TFCTH-1619', 'TFCTH-1620',
    'TFCTH-1621', 'TFCTH-1622', 'TFCTH-1623', 'TFCTH-1624', 'TFCTH-1625', 'TFCTH-1626',
    'TFCTH-1627', 'TFCTH-1628'
  ];

  // Run 2 Financial Ledger IDs: TFCFL-1325 to TFCFL-1356
  const run2LedgerIds = [
    'TFCFL-1325', 'TFCFL-1326', 'TFCFL-1327', 'TFCFL-1328', 'TFCFL-1329', 'TFCFL-1330',
    'TFCFL-1331', 'TFCFL-1332', 'TFCFL-1333', 'TFCFL-1334', 'TFCFL-1335', 'TFCFL-1336',
    'TFCFL-1337', 'TFCFL-1338', 'TFCFL-1339', 'TFCFL-1340', 'TFCFL-1341', 'TFCFL-1342',
    'TFCFL-1343', 'TFCFL-1344', 'TFCFL-1345', 'TFCFL-1346', 'TFCFL-1347', 'TFCFL-1348',
    'TFCFL-1349', 'TFCFL-1350', 'TFCFL-1351', 'TFCFL-1352', 'TFCFL-1353', 'TFCFL-1354',
    'TFCFL-1355', 'TFCFL-1356'
  ];

  // Pre-fetch all necessary data outside transaction
  const [seasonTeams, activeTransfers, ledgerEntries] = await Promise.all([
    prisma.season_teams.findMany({
      where: { seasonId },
      include: { team: true }
    }),
    prisma.transfer_history.findMany({
      where: {
        seasonId,
        status: 'ACTIVE',
        id: { notIn: run2TransferIds } // Exclude Run 2 transfers
      }
    }),
    prisma.financial_ledger.findMany({
      where: {
        seasonId,
        id: { notIn: run2LedgerIds } // Exclude Run 2 ledger entries
      }
    })
  ]);

  console.log(`Pre-fetched ${seasonTeams.length} season teams, ${activeTransfers.length} valid active transfers, and ${ledgerEntries.length} valid ledger entries.`);

  // Calculate corrected budgets
  const budgetUpdates: Array<{ id: string; teamName: string; correctedBudget: number; spent: number; playerCount: number }> = [];

  for (const st of seasonTeams) {
    const initialPurseEntry = ledgerEntries.find(l => l.seasonTeamId === st.id && l.transactionType === 'INITIAL_PURSE');
    const initialPurse = initialPurseEntry ? initialPurseEntry.amount : 10000;

    const teamTransfers = activeTransfers.filter(t => t.teamId === st.teamId);
    const totalSpent = teamTransfers.reduce((sum, t) => sum + t.soldPrice, 0);

    const teamAdjustments = ledgerEntries.filter(l => l.seasonTeamId === st.id && l.transactionType === 'ADJUSTMENT');
    const totalAdjustments = teamAdjustments.reduce((sum, l) => sum + l.amount, 0);

    const correctedBudget = initialPurse - totalSpent + totalAdjustments;

    budgetUpdates.push({
      id: st.id,
      teamName: st.team.name,
      correctedBudget,
      spent: totalSpent,
      playerCount: teamTransfers.length
    });
  }

  // Perform Cleanup in Transaction with extended timeout
  console.log(`\n⏳ Executing database transaction...`);

  await prisma.$transaction(async (tx) => {
    // 1. Delete Run 2 duplicate transfers
    const deletedTransfers = await tx.transfer_history.deleteMany({
      where: { id: { in: run2TransferIds } }
    });
    console.log(`   ✓ Deleted ${deletedTransfers.count} duplicate transfer records`);

    // 2. Delete Run 2 duplicate ledger entries
    const deletedLedger = await tx.financial_ledger.deleteMany({
      where: { id: { in: run2LedgerIds } }
    });
    console.log(`   ✓ Deleted ${deletedLedger.count} duplicate financial ledger records`);

    // 3. Update currentBudget for all teams
    for (const update of budgetUpdates) {
      await tx.season_teams.update({
        where: { id: update.id },
        data: { currentBudget: update.correctedBudget }
      });
      console.log(`      ✓ ${update.teamName.padEnd(20)}: Budget set to £${update.correctedBudget.toLocaleString()} (Spent £${update.spent.toLocaleString()} across ${update.playerCount} players)`);
    }
  }, {
    timeout: 30000
  });

  console.log(`\n✅ Transaction completed successfully!`);

  // Perform Final Audit Verification
  console.log(`\n================================================================================`);
  console.log(`📊 AUDIT VERIFICATION FOR ALL TEAMS IN ${seasonId}`);
  console.log(`================================================================================\n`);

  const auditTeams = await prisma.season_teams.findMany({
    where: { seasonId: seasonId },
    include: { team: true }
  });

  let errorCount = 0;

  for (const st of auditTeams) {
    const initialPurseEntry = await prisma.financial_ledger.findFirst({
      where: { seasonTeamId: st.id, transactionType: 'INITIAL_PURSE' }
    });
    const initialPurse = initialPurseEntry ? initialPurseEntry.amount : 10000;

    const teamTransfers = await prisma.transfer_history.findMany({
      where: { seasonId: seasonId, teamId: st.teamId, status: 'ACTIVE' }
    });
    const totalSpent = teamTransfers.reduce((sum, t) => sum + t.soldPrice, 0);

    const ledgerAdjustments = await prisma.financial_ledger.findMany({
      where: { seasonTeamId: st.id, transactionType: 'ADJUSTMENT' }
    });
    const totalAdjustments = ledgerAdjustments.reduce((sum, l) => sum + l.amount, 0);

    const expectedBudget = initialPurse - totalSpent + totalAdjustments;
    const diff = st.currentBudget - expectedBudget;

    if (diff !== 0) {
      errorCount++;
      console.log(`❌ ERROR: ${st.team.name} | Current: £${st.currentBudget} | Expected: £${expectedBudget} | Diff: £${diff}`);
    }
  }

  if (errorCount === 0) {
    console.log(`🎉 ALL ${auditTeams.length} TEAMS VERIFIED WITH 0 DISCREPANCY!`);
  } else {
    console.log(`⚠️ ${errorCount} teams still have balance discrepancies.`);
  }

  console.log(`\n================================================================================\n`);
}

main()
  .catch((err) => {
    console.error(`❌ Cleanup failed:`, err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
