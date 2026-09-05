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

  // Check for active tiebreakers and attempt auto-resolution for completed ones
  const { checkTiebreakerComplete, resolveTiebreaker } = await import('../lib/auction/tiebreaker');
  
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
    console.log(`\n🔍 Found ${activeTiebreakers.length} active tiebreaker(s):`);
    let remainingActive = 0;

    for (const tb of activeTiebreakers) {
      const isComplete = await checkTiebreakerComplete(tb.id);
      if (isComplete) {
        console.log(`   ⚡ Auto-resolving completed active tiebreaker for ${tb.basePlayer.name} (${tb.id})...`);
        const res = await resolveTiebreaker(tb.id);
        if (res.success && res.winnerId) {
          console.log(`   ✅ Resolved: Winner is Team ${res.winnerId} at £${res.winningBid}`);
        } else {
          console.log(`   ⚠️ Could not auto-resolve: ${res.error}`);
          remainingActive++;
        }
      } else {
        console.log(`   ⏳ ${tb.basePlayer.name} (ID: ${tb.id}) is still waiting for team bids.`);
        remainingActive++;
      }
    }

    if (remainingActive > 0) {
      console.log(`\n⚠️  Round reset to "tiebreaker_pending" because ${remainingActive} tiebreaker(s) require resolution.`);
      await prisma.rounds.update({
        where: { id: roundId },
        data: { status: 'tiebreaker_pending' }
      });
      console.log('   Teams can now submit missing bids or admins can spin-resolve.');
      return;
    }
  }

  // Re-fetch completed tiebreakers after potential auto-resolutions
  const updatedCompletedTiebreakers = await prisma.tiebreakers.findMany({
    where: {
      roundId,
      status: 'completed',
      winningTeamId: { not: null }
    },
    select: {
      id: true,
      winningTeamId: true,
      winningBid: true,
      basePlayer: {
        select: { name: true }
      }
    }
  });

  if (updatedCompletedTiebreakers.length === 0) {
    console.log('\n⚠️  No completed tiebreakers found.');
    console.log('   Resetting status to "pending_finalization".');
    
    await prisma.rounds.update({
      where: { id: roundId },
      data: { status: 'pending_finalization' }
    });

    console.log('\n✅ Round status reset to "pending_finalization". You can now finalize normally.');
    return;
  }

  // Reset status to tiebreaker_pending so Force Re-finalize can complete the round
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
  console.log('   3. The system will apply completed tiebreakers and finish finalization');
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
