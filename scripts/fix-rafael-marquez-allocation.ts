import { prisma } from '../lib/prisma';

/**
 * Fix Rafael Márquez allocation - he was allocated from CB-B instead of CB-A
 * Find the transfer, delete it, and randomly allocate a CB-A player instead
 */

async function fixRafaelMarquezAllocation() {
  console.log('\n🔧 Starting Rafael Márquez Allocation Fix...\n');

  try {
    // 1. Find Rafael Márquez
    const rafaelMarquez = await prisma.base_players.findFirst({
      where: {
        name: {
          contains: 'Rafael Márquez',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!rafaelMarquez) {
      console.log('❌ Rafael Márquez not found in database');
      return;
    }

    console.log(`✅ Found player: ${rafaelMarquez.name} (${rafaelMarquez.id})`);

    // 2. Find his transfer history
    const transfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: rafaelMarquez.id
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            position_group: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!transfer) {
      console.log('❌ No transfer found for Rafael Márquez');
      return;
    }

    console.log(`\n📋 Current Transfer Details:`);
    console.log(`   Team: ${transfer.team.name}`);
    console.log(`   Season: ${transfer.season.name}`);
    console.log(`   Round: ${transfer.round?.roundNumber || 'N/A'}`);
    console.log(`   Round Position Group: ${transfer.round?.position_group || 'N/A'}`);
    console.log(`   Price: £${transfer.soldPrice}`);
    console.log(`   Acquisition Type: ${transfer.acquisitionType}`);

    // 3. Check Rafael's position group
    const rafaelStats = await prisma.seasonal_player_stats.findFirst({
      where: {
        basePlayerId: rafaelMarquez.id,
        seasonId: transfer.seasonId
      },
      select: {
        position: true,
        position_group: true,
        overallRating: true
      }
    });

    if (!rafaelStats) {
      console.log('❌ No seasonal stats found for Rafael Márquez');
      return;
    }

    console.log(`\n👤 Rafael Márquez Stats:`);
    console.log(`   Position: ${rafaelStats.position}`);
    console.log(`   Position Group: ${rafaelStats.position_group}`);
    console.log(`   Overall Rating: ${rafaelStats.overallRating}`);

    // 4. Verify the issue
    const roundPositionGroup = transfer.round?.position_group;
    if (rafaelStats.position_group === roundPositionGroup) {
      console.log(`\n✅ No issue found - Rafael is in the correct position group (${rafaelStats.position_group})`);
      return;
    }

    console.log(`\n⚠️  ISSUE CONFIRMED:`);
    console.log(`   Rafael is in ${rafaelStats.position_group} but was allocated from ${roundPositionGroup} round`);

    // 5. Find available CB-A players (or whatever the round's position group was)
    if (!roundPositionGroup) {
      console.log('❌ Round has no position group specified');
      return;
    }

    // Need to find CB players with position_group A (not just any A players)
    const targetPosition = rafaelStats.position; // CB
    const targetPositionGroup = roundPositionGroup; // A

    console.log(`\n🔍 Searching for available ${targetPosition}-${targetPositionGroup} players...`);

    const availablePlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId: transfer.seasonId,
        position: targetPosition,
        position_group: targetPositionGroup,
        basePlayer: {
          transferHistory: {
            none: {
              seasonId: transfer.seasonId
            }
          }
        }
      },
      select: {
        basePlayerId: true,
        basePlayer: {
          select: {
            id: true,
            name: true
          }
        },
        position: true,
        position_group: true,
        overallRating: true
      },
      orderBy: {
        overallRating: 'desc'
      }
    });

    console.log(`\n📊 Found ${availablePlayers.length} available ${targetPosition}-${targetPositionGroup} players:`);
    availablePlayers.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.basePlayer.name} - ${p.position} (${p.position_group}) - OVR ${p.overallRating}`);
    });

    if (availablePlayers.length === 0) {
      console.log(`\n❌ No available ${targetPosition}-${targetPositionGroup} players found to replace Rafael Márquez`);
      return;
    }

    // 6. Randomly select a replacement player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const replacementPlayer = availablePlayers[randomIndex];

    console.log(`\n🎲 Randomly selected: ${replacementPlayer.basePlayer.name} (index ${randomIndex})`);

    // 7. Confirm before making changes
    console.log(`\n⚠️  READY TO MAKE CHANGES:`);
    console.log(`   1. Delete Rafael Márquez transfer (${transfer.id})`);
    console.log(`   2. Create new transfer for ${replacementPlayer.basePlayer.name}`);
    console.log(`   3. Update team budget (refund Rafael's price, charge replacement price)`);
    console.log(`   4. Update financial ledger`);

    // Execute the fix
    await prisma.$transaction(async (tx) => {
      // Get current team budget
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: transfer.seasonId,
            teamId: transfer.teamId
          }
        },
        select: {
          id: true,
          currentBudget: true
        }
      });

      if (!seasonTeam) {
        throw new Error('Season team not found');
      }

      const oldBudget = seasonTeam.currentBudget;

      // Delete old transfer
      await tx.transfer_history.delete({
        where: { id: transfer.id }
      });
      console.log(`\n   ✅ Deleted Rafael Márquez transfer`);

      // Refund the old price
      const refundedBudget = oldBudget + transfer.soldPrice;

      // Create new transfer with same price
      const { generateTransferId, generateFinancialId } = await import('../lib/id-generator');
      const newTransferId = await generateTransferId();
      
      await tx.transfer_history.create({
        data: {
          id: newTransferId,
          basePlayerId: replacementPlayer.basePlayerId,
          seasonId: transfer.seasonId,
          teamId: transfer.teamId,
          roundId: transfer.roundId,
          soldPrice: transfer.soldPrice,
          acquisitionType: transfer.acquisitionType,
          acquisitionNotes: `Fixed allocation: Replaced Rafael Márquez (CB-B, wrong group) with ${replacementPlayer.basePlayer.name} (CB-${roundPositionGroup}, correct group). ${transfer.acquisitionNotes || ''}`,
          status: 'ACTIVE'
        }
      });
      console.log(`   ✅ Created new transfer for ${replacementPlayer.basePlayer.name}`);

      // Update budget (refund old, charge new - net zero since same price)
      const finalBudget = refundedBudget - transfer.soldPrice;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: transfer.seasonId,
            teamId: transfer.teamId
          }
        },
        data: {
          currentBudget: finalBudget
        }
      });
      console.log(`   ✅ Updated team budget: £${oldBudget} → £${refundedBudget} (refund) → £${finalBudget} (new charge)`);

      // Add financial ledger entries
      const ledgerId1 = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId1,
          seasonTeamId: seasonTeam.id,
          seasonId: transfer.seasonId,
          transactionType: 'ADJUSTMENT',
          amount: transfer.soldPrice,
          previousBalance: oldBudget,
          newBalance: refundedBudget,
          description: `Refund for Rafael Márquez (CB-B, wrong position group allocation)`,
          playerName: rafaelMarquez.name
        }
      });

      const ledgerId2 = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId2,
          seasonTeamId: seasonTeam.id,
          seasonId: transfer.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -transfer.soldPrice,
          previousBalance: refundedBudget,
          newBalance: finalBudget,
          description: `Corrected allocation: ${replacementPlayer.basePlayer.name} (CB-${roundPositionGroup})`,
          playerName: replacementPlayer.basePlayer.name
        }
      });
      console.log(`   ✅ Created financial ledger entries`);
    });

    console.log(`\n✅ FIX COMPLETE!`);
    console.log(`\n📊 Summary:`);
    console.log(`   ❌ Removed: Rafael Márquez (${rafaelStats.position_group})`);
    console.log(`   ✅ Added: ${replacementPlayer.basePlayer.name} (${replacementPlayer.position_group})`);
    console.log(`   💰 Price: £${transfer.soldPrice} (unchanged)`);
    console.log(`   🏆 Team: ${transfer.team.name}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the fix
fixRafaelMarquezAllocation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
