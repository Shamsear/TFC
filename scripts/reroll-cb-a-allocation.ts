import { prisma } from '../lib/prisma';

/**
 * Re-roll the CB-A allocation for Juventus
 * Replace current CB-A player with another random CB-A player
 */

async function rerollCBAAllocation() {
  console.log('\n🎲 Re-rolling CB-A allocation for Juventus...\n');

  try {
    // 1. Find Juventus's most recent CB-A transfer
    const currentTransfer = await prisma.transfer_history.findFirst({
      where: {
        team: {
          name: 'Juventus'
        },
        seasonId: 'TFCS-4',
        basePlayer: {
          seasonalPlayerStats: {
            some: {
              seasonId: 'TFCS-4',
              position: 'CB',
              position_group: 'A'
            }
          }
        }
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
        },
        basePlayer: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!currentTransfer) {
      console.log('❌ No CB-A transfer found for Juventus');
      return;
    }

    console.log(`✅ Found current CB-A transfer:`);
    console.log(`   Player: ${currentTransfer.basePlayer.name}`);
    console.log(`   Team: ${currentTransfer.team.name}`);
    console.log(`   Round: ${currentTransfer.round?.roundNumber} (${currentTransfer.round?.position_group})`);
    console.log(`   Price: £${currentTransfer.soldPrice}`);

    // 2. Find available CB-A players (excluding current one)
    console.log(`\n🔍 Searching for other available CB-A players...`);

    const availablePlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId: currentTransfer.seasonId,
        position: 'CB',
        position_group: 'A',
        basePlayerId: {
          not: currentTransfer.basePlayerId // Exclude current player
        },
        basePlayer: {
          transferHistory: {
            none: {
              seasonId: currentTransfer.seasonId
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

    console.log(`\n📊 Found ${availablePlayers.length} other available CB-A players:`);
    availablePlayers.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.basePlayer.name} - ${p.position} (${p.position_group}) - OVR ${p.overallRating}`);
    });

    if (availablePlayers.length === 0) {
      console.log(`\n❌ No other available CB-A players found`);
      return;
    }

    // 3. Randomly select a different CB-A player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const replacementPlayer = availablePlayers[randomIndex];

    console.log(`\n🎲 Randomly selected: ${replacementPlayer.basePlayer.name} (index ${randomIndex})`);
    console.log(`   Position: ${replacementPlayer.position}-${replacementPlayer.position_group}`);
    console.log(`   Overall: ${replacementPlayer.overallRating}`);

    // 4. Execute the swap
    console.log(`\n⚠️  READY TO MAKE CHANGES:`);
    console.log(`   1. Delete ${currentTransfer.basePlayer.name} transfer`);
    console.log(`   2. Create transfer for ${replacementPlayer.basePlayer.name}`);
    console.log(`   3. Budget remains unchanged (same price: £${currentTransfer.soldPrice})`);

    await prisma.$transaction(async (tx) => {
      // Get current team budget
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: currentTransfer.seasonId,
            teamId: currentTransfer.teamId
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

      // Delete current transfer
      await tx.transfer_history.delete({
        where: { id: currentTransfer.id }
      });
      console.log(`\n   ✅ Deleted ${currentTransfer.basePlayer.name} transfer`);

      // Refund current price
      const refundedBudget = oldBudget + currentTransfer.soldPrice;

      // Create new transfer with same price
      const { generateTransferId, generateFinancialId } = await import('../lib/id-generator');
      const newTransferId = await generateTransferId();
      
      await tx.transfer_history.create({
        data: {
          id: newTransferId,
          basePlayerId: replacementPlayer.basePlayerId,
          seasonId: currentTransfer.seasonId,
          teamId: currentTransfer.teamId,
          roundId: currentTransfer.roundId,
          soldPrice: currentTransfer.soldPrice,
          acquisitionType: currentTransfer.acquisitionType,
          acquisitionNotes: `Re-rolled CB-A allocation: ${currentTransfer.basePlayer.name} → ${replacementPlayer.basePlayer.name}`
        }
      });
      console.log(`   ✅ Created transfer for ${replacementPlayer.basePlayer.name}`);

      // Update budget (refund + charge = net zero)
      const finalBudget = refundedBudget - currentTransfer.soldPrice;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: currentTransfer.seasonId,
            teamId: currentTransfer.teamId
          }
        },
        data: {
          currentBudget: finalBudget
        }
      });
      console.log(`   ✅ Budget: £${oldBudget} → £${refundedBudget} (refund) → £${finalBudget} (charge)`);

      // Add financial ledger entries
      const ledgerId1 = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId1,
          seasonTeamId: seasonTeam.id,
          seasonId: currentTransfer.seasonId,
          transactionType: 'ADJUSTMENT',
          amount: currentTransfer.soldPrice,
          previousBalance: oldBudget,
          newBalance: refundedBudget,
          description: `Refund for ${currentTransfer.basePlayer.name} (CB-A re-roll)`,
          playerName: currentTransfer.basePlayer.name
        }
      });

      const ledgerId2 = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId2,
          seasonTeamId: seasonTeam.id,
          seasonId: currentTransfer.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -currentTransfer.soldPrice,
          previousBalance: refundedBudget,
          newBalance: finalBudget,
          description: `Re-rolled CB-A allocation: ${replacementPlayer.basePlayer.name}`,
          playerName: replacementPlayer.basePlayer.name
        }
      });
      console.log(`   ✅ Created financial ledger entries`);
    });

    console.log(`\n✅ RE-ROLL COMPLETE!`);
    console.log(`\n📊 Summary:`);
    console.log(`   ❌ Removed: ${currentTransfer.basePlayer.name} (CB-A)`);
    console.log(`   ✅ Added: ${replacementPlayer.basePlayer.name} (CB-A)`);
    console.log(`   💰 Price: £${currentTransfer.soldPrice} (unchanged)`);
    console.log(`   🏆 Team: ${currentTransfer.team.name}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the re-roll
rerollCBAAllocation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
