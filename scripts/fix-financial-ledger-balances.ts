import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFinancialLedgerBalances(seasonId: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 FIXING FINANCIAL LEDGER BALANCES FOR SEASON: ${seasonId}`);
  console.log(`${'='.repeat(80)}\n`);

  // Get season info
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      name: true,
      startingPurse: true
    }
  });

  if (!season) {
    console.error('❌ Season not found');
    return;
  }

  console.log(`📋 Season: ${season.name}`);
  console.log(`💰 Starting Purse: £${season.startingPurse.toLocaleString()}\n`);

  // Get all teams in the season
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      team: {
        name: 'asc'
      }
    }
  });

  console.log(`👥 Found ${seasonTeams.length} teams\n`);

  let totalTeamsFixed = 0;
  let totalEntriesFixed = 0;

  for (const seasonTeam of seasonTeams) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🏆 Processing: ${seasonTeam.team.name}`);
    console.log(`${'─'.repeat(80)}`);

    // Get all ledger entries for this team in chronological order
    const ledgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId,
        seasonTeamId: seasonTeam.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (ledgerEntries.length === 0) {
      console.log('   ℹ️  No ledger entries found, skipping...');
      continue;
    }

    console.log(`   📊 Found ${ledgerEntries.length} ledger entries`);

    // Recalculate balances
    let runningBalance = season.startingPurse;
    let entriesFixed = 0;
    const updates: Array<{ id: string; previousBalance: number; newBalance: number }> = [];

    for (let i = 0; i < ledgerEntries.length; i++) {
      const entry = ledgerEntries[i];
      const previousBalance = runningBalance;
      const newBalance = runningBalance + entry.amount;

      // Check if values need updating
      const needsUpdate = 
        Math.abs(entry.previousBalance - previousBalance) > 0.01 ||
        Math.abs(entry.newBalance - newBalance) > 0.01;

      if (needsUpdate) {
        updates.push({
          id: entry.id,
          previousBalance,
          newBalance
        });
        entriesFixed++;

        console.log(`   🔄 Entry ${i + 1}: ${entry.transactionType}`);
        console.log(`      Amount: £${entry.amount.toLocaleString()}`);
        console.log(`      Old: £${entry.previousBalance.toLocaleString()} → £${entry.newBalance.toLocaleString()}`);
        console.log(`      New: £${previousBalance.toLocaleString()} → £${newBalance.toLocaleString()}`);
      }

      runningBalance = newBalance;
    }

    if (updates.length > 0) {
      console.log(`\n   💾 Updating ${updates.length} ledger entries...`);

      // Update all entries in a transaction
      await prisma.$transaction(
        updates.map(update =>
          prisma.financial_ledger.update({
            where: { id: update.id },
            data: {
              previousBalance: update.previousBalance,
              newBalance: update.newBalance
            }
          })
        )
      );

      console.log(`   ✅ Updated ${updates.length} entries`);
      totalTeamsFixed++;
      totalEntriesFixed += updates.length;
    } else {
      console.log(`   ✅ All entries already correct`);
    }

    // Update season_teams.currentBudget to match final balance
    const finalBalance = runningBalance;
    if (Math.abs(seasonTeam.currentBudget - finalBalance) > 0.01) {
      console.log(`\n   💰 Updating team budget:`);
      console.log(`      Old: £${seasonTeam.currentBudget.toLocaleString()}`);
      console.log(`      New: £${finalBalance.toLocaleString()}`);

      await prisma.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId,
            teamId: seasonTeam.teamId
          }
        },
        data: {
          currentBudget: finalBalance
        }
      });

      console.log(`   ✅ Budget updated`);
    } else {
      console.log(`\n   ✅ Budget already correct: £${finalBalance.toLocaleString()}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ COMPLETED`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Summary:`);
  console.log(`   • Teams processed: ${seasonTeams.length}`);
  console.log(`   • Teams fixed: ${totalTeamsFixed}`);
  console.log(`   • Ledger entries fixed: ${totalEntriesFixed}`);
  console.log(`${'='.repeat(80)}\n`);
}

// Run the script
const seasonId = process.argv[2] || 'TFCS-4';

fixFinancialLedgerBalances(seasonId)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
