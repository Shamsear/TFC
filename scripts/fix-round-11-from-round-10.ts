import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRound11FromRound10(seasonId: string, dryRun: boolean = true) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔧 ${dryRun ? 'PREVIEW' : 'FIXING'} ROUND 11 LEDGER ENTRIES USING ROUND 10 AS BASE`);
  console.log(`   Season: ${seasonId}`);
  console.log(`   Mode: ${dryRun ? '👁️  DRY RUN (Preview Only)' : '✏️  LIVE UPDATE'}`);
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

  console.log(`📋 Season: ${season.name}\n`);

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
    console.log(`🏆 ${seasonTeam.team.name}`);
    console.log(`${'─'.repeat(80)}`);

    // Get Round 10 entry
    const round10Entry = await prisma.financial_ledger.findFirst({
      where: {
        seasonId,
        seasonTeamId: seasonTeam.id,
        description: 'Round TFCR-10 player purchases'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!round10Entry) {
      console.log('   ⚠️  No Round 10 entry found, skipping...');
      continue;
    }

    console.log(`   📊 Round 10 Entry:`);
    console.log(`      Amount: £${round10Entry.amount.toLocaleString()}`);
    console.log(`      Previous: £${round10Entry.previousBalance.toLocaleString()}`);
    console.log(`      New: £${round10Entry.newBalance.toLocaleString()}`);

    // Get Round 11 entry
    const round11Entry = await prisma.financial_ledger.findFirst({
      where: {
        seasonId,
        seasonTeamId: seasonTeam.id,
        description: 'Round TFCR-11 player purchases'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!round11Entry) {
      console.log('   ℹ️  No Round 11 entry found');
      continue;
    }

    console.log(`\n   📊 Round 11 Entry (BEFORE):`);
    console.log(`      Amount: £${round11Entry.amount.toLocaleString()}`);
    console.log(`      Previous: £${round11Entry.previousBalance.toLocaleString()}`);
    console.log(`      New: £${round11Entry.newBalance.toLocaleString()}`);

    // Calculate correct values
    const correctPreviousBalance = round10Entry.newBalance;
    const correctNewBalance = correctPreviousBalance + round11Entry.amount;

    console.log(`\n   ✅ Round 11 Entry (SHOULD BE):`);
    console.log(`      Amount: £${round11Entry.amount.toLocaleString()}`);
    console.log(`      Previous: £${correctPreviousBalance.toLocaleString()}`);
    console.log(`      New: £${correctNewBalance.toLocaleString()}`);

    // Check if update is needed
    const needsUpdate = 
      Math.abs(round11Entry.previousBalance - correctPreviousBalance) > 0.01 ||
      Math.abs(round11Entry.newBalance - correctNewBalance) > 0.01;

    if (needsUpdate) {
      if (dryRun) {
        console.log(`\n   �️  WOULD UPDATE Round 11 entry (DRY RUN)`);
        console.log(`      Ledger ID: ${round11Entry.id}`);
        console.log(`      Changes:`);
        console.log(`         previousBalance: ${round11Entry.previousBalance} → ${correctPreviousBalance}`);
        console.log(`         newBalance: ${round11Entry.newBalance} → ${correctNewBalance}`);
        
        console.log(`\n   👁️  WOULD UPDATE team budget (DRY RUN)`);
        console.log(`      Team ID: ${seasonTeam.teamId}`);
        console.log(`      Changes:`);
        console.log(`         currentBudget: ${seasonTeam.currentBudget} → ${correctNewBalance}`);
      } else {
        console.log(`\n   � Updating Round 11 entry...`);

        await prisma.financial_ledger.update({
          where: { id: round11Entry.id },
          data: {
            previousBalance: correctPreviousBalance,
            newBalance: correctNewBalance
          }
        });

        console.log(`   ✅ Updated`);

        // Update season_teams.currentBudget
        console.log(`\n   💰 Updating team budget:`);
        console.log(`      Old: £${seasonTeam.currentBudget.toLocaleString()}`);
        console.log(`      New: £${correctNewBalance.toLocaleString()}`);

        await prisma.season_teams.update({
          where: {
            seasonId_teamId: {
              seasonId,
              teamId: seasonTeam.teamId
            }
          },
          data: {
            currentBudget: correctNewBalance
          }
        });

        console.log(`   ✅ Budget updated`);
      }

      totalTeamsFixed++;
      totalEntriesFixed++;
    } else {
      console.log(`\n   ✅ Round 11 entry already correct`);
    }

    // Show the math
    console.log(`\n   🧮 Verification:`);
    console.log(`      Round 10 ending: £${round10Entry.newBalance.toLocaleString()}`);
    console.log(`      Round 11 spent: £${Math.abs(round11Entry.amount).toLocaleString()}`);
    console.log(`      Round 11 ending: £${correctNewBalance.toLocaleString()}`);
    console.log(`      Formula: ${round10Entry.newBalance.toLocaleString()} + (${round11Entry.amount.toLocaleString()}) = ${correctNewBalance.toLocaleString()}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ ${dryRun ? 'PREVIEW' : 'UPDATE'} COMPLETED`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Summary:`);
  console.log(`   • Teams processed: ${seasonTeams.length}`);
  console.log(`   • Teams ${dryRun ? 'that need fixing' : 'fixed'}: ${totalTeamsFixed}`);
  console.log(`   • Ledger entries ${dryRun ? 'that need fixing' : 'fixed'}: ${totalEntriesFixed}`);
  
  if (dryRun && totalTeamsFixed > 0) {
    console.log(`\n⚠️  This was a DRY RUN - no changes were made`);
    console.log(`   To apply these changes, run: npm run fix-round-11 ${seasonId} apply`);
  }
  console.log(`${'='.repeat(80)}\n`);
}

// Run the script
const seasonId = process.argv[2] || 'TFCS-4';
const mode = process.argv[3]; // 'apply' to actually make changes
const dryRun = mode !== 'apply';

if (dryRun) {
  console.log('\n⚠️  Running in PREVIEW mode - no changes will be made');
  console.log('   To apply changes, add "apply" as the third argument\n');
}

fixRound11FromRound10(seasonId, dryRun)
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
