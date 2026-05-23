import { prisma } from '../lib/prisma';

/**
 * Fix Manchester United's balance discrepancy
 * The ledger shows £4,630 after entry 8, but entry 9 starts from £4,552
 */

async function fixManchesterUnitedBalance() {
  console.log('\n🔧 Investigating Manchester United Balance Issue...\n');

  try {
    const seasonId = 'TFCS-4';

    // Find Manchester United's season team
    const seasonTeam = await prisma.season_teams.findFirst({
      where: {
        seasonId: seasonId,
        team: {
          name: 'Manchester United'
        }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!seasonTeam) {
      console.log('❌ Manchester United not found');
      return;
    }

    console.log(`✅ Found: ${seasonTeam.team.name}`);
    console.log(`   Current Balance: £${seasonTeam.currentBudget}`);

    // Get all ledger entries
    const ledgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId: seasonId,
        seasonTeamId: seasonTeam.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`\n📋 Ledger Entries (${ledgerEntries.length}):\n`);

    let expectedBalance = 0;
    let errors: string[] = [];

    ledgerEntries.forEach((entry, idx) => {
      const sign = entry.amount >= 0 ? '+' : '';
      console.log(`${idx + 1}. ${entry.transactionType.padEnd(20)} ${sign}£${entry.amount.toString().padStart(6)}`);
      console.log(`   Previous: £${entry.previousBalance} | New: £${entry.newBalance}`);
      
      // Check if this is the first entry
      if (idx === 0) {
        expectedBalance = entry.newBalance;
      } else {
        // Check if previous balance matches expected
        if (entry.previousBalance !== expectedBalance) {
          const error = `   ⚠️  ERROR: Expected previous balance £${expectedBalance}, got £${entry.previousBalance} (diff: £${entry.previousBalance - expectedBalance})`;
          console.log(error);
          errors.push(error);
        }
        
        // Check if calculation is correct
        const calculatedNew = entry.previousBalance + entry.amount;
        if (calculatedNew !== entry.newBalance) {
          const error = `   ⚠️  ERROR: ${entry.previousBalance} + ${entry.amount} = ${calculatedNew}, but newBalance is ${entry.newBalance}`;
          console.log(error);
          errors.push(error);
        }
        
        expectedBalance = entry.newBalance;
      }
      
      if (entry.playerName) {
        console.log(`   Player: ${entry.playerName}`);
      }
      console.log('');
    });

    console.log(`\n📊 Analysis:`);
    console.log(`   Expected Final Balance: £${expectedBalance}`);
    console.log(`   Actual Current Balance: £${seasonTeam.currentBudget}`);
    console.log(`   Difference: £${seasonTeam.currentBudget - expectedBalance}`);
    console.log(`   Errors Found: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Ledger Chain Errors:`);
      errors.forEach(err => console.log(err));
    }

    // Get all transfers to verify total spent
    const transfers = await prisma.transfer_history.findMany({
      where: {
        seasonId: seasonId,
        teamId: seasonTeam.teamId
      },
      select: {
        soldPrice: true,
        basePlayer: {
          select: {
            name: true
          }
        }
      }
    });

    const totalSpent = transfers.reduce((sum, t) => sum + t.soldPrice, 0);
    console.log(`\n💰 Transfer Summary:`);
    console.log(`   Total Players: ${transfers.length}`);
    console.log(`   Total Spent: £${totalSpent}`);
    console.log(`   Initial Purse: £10,000`);
    console.log(`   Expected Balance: £${10000 - totalSpent}`);

    // Check if we need to fix the current balance
    const correctBalance = 10000 - totalSpent;
    if (seasonTeam.currentBudget !== correctBalance) {
      console.log(`\n⚠️  BALANCE CORRECTION NEEDED:`);
      console.log(`   Current: £${seasonTeam.currentBudget}`);
      console.log(`   Should be: £${correctBalance}`);
      console.log(`   Adjustment: £${correctBalance - seasonTeam.currentBudget}`);

      // Ask to fix
      console.log(`\n🔧 Applying fix...`);
      
      await prisma.season_teams.update({
        where: {
          id: seasonTeam.id
        },
        data: {
          currentBudget: correctBalance
        }
      });

      console.log(`✅ Balance corrected: £${seasonTeam.currentBudget} → £${correctBalance}`);
    } else {
      console.log(`\n✅ Balance is correct, no fix needed`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the fix
fixManchesterUnitedBalance()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
