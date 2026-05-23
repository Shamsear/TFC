import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRoundLedgerEntries(seasonId: string, roundId?: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 FIXING ROUND LEDGER ENTRIES FOR SEASON: ${seasonId}`);
  if (roundId) {
    console.log(`   Specific Round: ${roundId}`);
  }
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

  let totalEntriesFixed = 0;
  let totalTeamsAffected = 0;

  for (const seasonTeam of seasonTeams) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🏆 ${seasonTeam.team.name}`);
    console.log(`${'─'.repeat(80)}`);

    // Get all ledger entries for this team in chronological order
    const allLedgerEntries = await prisma.financial_ledger.findMany({
      where: {
        seasonId,
        seasonTeamId: seasonTeam.id
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (allLedgerEntries.length === 0) {
      console.log('   ℹ️  No ledger entries found');
      continue;
    }

    // Find entries that match the round pattern
    const roundPattern = roundId 
      ? `Round ${roundId} player purchases`
      : /^Round TFCR-\d+ player purchases$/;

    const problematicEntries = allLedgerEntries.filter(entry => 
      roundId 
        ? entry.description === roundPattern
        : roundPattern.test(entry.description || '')
    );

    if (problematicEntries.length === 0) {
      console.log('   ✅ No problematic round entries found');
      continue;
    }

    console.log(`   🔍 Found ${problematicEntries.length} round purchase entries to check`);

    // Recalculate all balances from the beginning
    let runningBalance = season.startingPurse;
    const updates: Array<{ id: string; previousBalance: number; newBalance: number; description: string }> = [];

    for (const entry of allLedgerEntries) {
      const previousBalance = runningBalance;
      const newBalance = runningBalance + entry.amount;

      // Check if this entry needs updating
      const needsUpdate = 
        Math.abs(entry.previousBalance - previousBalance) > 0.01 ||
        Math.abs(entry.newBalance - newBalance) > 0.01;

      if (needsUpdate) {
        updates.push({
          id: entry.id,
          previousBalance,
          newBalance,
          description: entry.description || 'N/A'
        });

        // Only log if it's a round purchase entry
        const isRoundEntry = roundId 
          ? entry.description === `Round ${roundId} player purchases`
          : /^Round TFCR-\d+ player purchases$/.test(entry.description || '');

        if (isRoundEntry) {
          console.log(`   🔄 ${entry.description}`);
          console.log(`      Amount: £${entry.amount.toLocaleString()}`);
          console.log(`      Old: £${entry.previousBalance.toLocaleString()} → £${entry.newBalance.toLocaleString()}`);
          console.log(`      New: £${previousBalance.toLocaleString()} → £${newBalance.toLocaleString()}`);
        }
      }

      runningBalance = newBalance;
    }

    if (updates.length > 0) {
      console.log(`\n   💾 Updating ${updates.length} ledger entries...`);

      // Update in batches of 50 to avoid transaction timeout
      const batchSize = 50;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        await prisma.$transaction(
          batch.map(update =>
            prisma.financial_ledger.update({
              where: { id: update.id },
              data: {
                previousBalance: update.previousBalance,
                newBalance: update.newBalance
              }
            })
          )
        );
        
        console.log(`      ✓ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`);
      }

      console.log(`   ✅ Updated ${updates.length} entries`);
      totalEntriesFixed += updates.length;
      totalTeamsAffected++;

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
      }
    } else {
      console.log(`   ✅ All entries already correct`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ COMPLETED`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Summary:`);
  console.log(`   • Teams processed: ${seasonTeams.length}`);
  console.log(`   • Teams affected: ${totalTeamsAffected}`);
  console.log(`   • Ledger entries fixed: ${totalEntriesFixed}`);
  console.log(`${'='.repeat(80)}\n`);
}

// Run the script
const seasonId = process.argv[2] || 'TFCS-4';
const roundId = process.argv[3]; // Optional: specific round ID like 'TFCR-11'

fixRoundLedgerEntries(seasonId, roundId)
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
