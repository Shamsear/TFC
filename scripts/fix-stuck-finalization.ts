import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Fix a round stuck in "finalizing" status after tiebreakers were completed
 * This script resets the status to "tiebreaker_pending" so force re-finalization can work
 */
async function fixStuckFinalization(roundId: string) {
  console.log(`\n🔧 Fixing stuck finalization for round: ${roundId}`);

  // Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    select: {
      id: true,
      roundNumber: true,
      status: true,
      roundType: true,
      _count: {
        select: {
          tiebreakers: true
        }
      }
    }
  });

  if (!round) {
    console.error('❌ Round not found');
    return;
  }

  console.log(`\nRound ${round.roundNumber}:`);
  console.log(`  Status: ${round.status}`);
  console.log(`  Type: ${round.roundType}`);
  console.log(`  Tiebreakers: ${round._count.tiebreakers}`);

  if (round.status !== 'finalizing') {
    console.log(`\n⚠️  Round is not stuck in "finalizing" status (current: ${round.status})`);
    console.log('   No action needed.');
    return;
  }

  // Check for completed tiebreakers
  const completedTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      roundId,
      status: 'completed',
      winningTeamId: { not: null }
    },
    select: {
      id: true,
      status: true,
      winningTeamId: true,
      winningBid: true,
      basePlayer: {
        select: {
          name: true
        }
      }
    }
  });

  console.log(`\n✅ Found ${completedTiebreakers.length} completed tiebreakers:`);
  completedTiebreakers.forEach(tb => {
    console.log(`   - ${tb.basePlayer.name} → Team ${tb.winningTeamId} (£${tb.winningBid})`);
  });

  // Check for active tiebreakers
  const activeTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      roundId,
      status: 'active'
    },
    select: {
      id: true,
      basePlayer: {
        select: {
          name: true
        }
      }
    }
  });

  if (activeTiebreakers.length > 0) {
    console.log(`\n⚠️  Found ${activeTiebreakers.length} active tiebreakers:`);
    activeTiebreakers.forEach(tb => {
      console.log(`   - ${tb.basePlayer.name} (ID: ${tb.id})`);
    });
    console.log('\n❌ Cannot fix: There are still active tiebreakers that need to be resolved.');
    console.log('   Please complete or resolve these tiebreakers first.');
    return;
  }

  if (completedTiebreakers.length === 0) {
    console.log('\n⚠️  No completed tiebreakers found.');
    console.log('   Resetting to "pending_finalization" instead.');
    
    await prisma.rounds.update({
      where: { id: roundId },
      data: {
        status: 'pending_finalization'
      }
    });

    console.log('\n✅ Round status reset to "pending_finalization"');
    console.log('   You can now finalize the round normally.');
    return;
  }

  // Reset status to tiebreaker_pending
  await prisma.rounds.update({
    where: { id: roundId },
    data: {
      status: 'tiebreaker_pending'
    }
  });

  console.log('\n✅ Round status reset to "tiebreaker_pending"');
  console.log('\n📋 Next steps:');
  console.log('   1. Go to the round page in the admin panel');
  console.log('   2. Click "Force Re-finalize" button');
  console.log('   3. The system will apply the completed tiebreakers and continue finalization');
  console.log('\n   The force re-finalize logic will:');
  console.log('   - Apply all completed tiebreakers');
  console.log('   - Continue finalization without creating duplicate tiebreakers');
  console.log('   - Complete the round if no more ties exist');
}

// Get round ID from command line
const roundId = process.argv[2];

if (!roundId) {
  console.error('❌ Usage: npx tsx scripts/fix-stuck-finalization.ts <ROUND_ID>');
  console.error('   Example: npx tsx scripts/fix-stuck-finalization.ts TFCR-15');
  process.exit(1);
}

fixStuckFinalization(roundId)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
