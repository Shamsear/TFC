import { prisma } from '../lib/prisma';

/**
 * Revert the incorrect Zlatan allocation and properly fix Rafael Márquez
 * 1. Delete Zlatan Ibrahimović transfer (CF-A, wrong position)
 * 2. Allocate a CB-A player instead
 */

async function revertAndFixAllocation() {
  console.log('\n🔧 Reverting Zlatan and fixing with CB-A player...\n');

  try {
    // 1. Find Zlatan's transfer to Juventus
    const zlatanTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayer: {
          name: {
            contains: 'Zlatan',
            mode: 'insensitive'
          }
        },
        team: {
          name: 'Juventus'
        },
        seasonId: 'TFCS-4'
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
      }
    });

    if (!zlatanTransfer) {
      console.log('❌ Zlatan transfer not found');
      return;
    }

    console.log(`✅ Found Zlatan transfer:`);
    console.log(`   Player: ${zlatanTransfer.basePlayer.name}`);
    console.log(`   Team: ${zlatanTransfer.team.name}`);
    console.log(`   Round: ${zlatanTransfer.round?.roundNumber} (${zlatanTransfer.round?.position_group})`);
    console.log(`   Price: £${zlatanTransfer.soldPrice}`);

    // 2. Find available CB-A players
    const roundPositionGroup = zlatanTransfer.round?.position_group;
    if (!roundPositionGroup) {
      console.log('❌ Round has no position group');
      return;
    }

    console.log(`\n🔍 Searching for available CB-${roundPositionGroup} players...`);

    const availablePlayers = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId: zlatanTransfer.seasonId,
        position: 'CB', // Must be CB
        position_group: roundPositionGroup, // Must be A
        basePlayer: {
          transferHistory: {
            none: {
              seasonId: zlatanTransfer.seasonId
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

    console.log(`\n📊 Found ${availablePlayers.length} available CB-${roundPositionGroup} players:`);
    availablePlayers.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.basePlayer.name} - ${p.position} (${p.position_group}) - OVR ${p.overallRating}`);
    });

    if (availablePlayers.length === 0) {
      console.log(`\n❌ No available CB-${roundPositionGroup} players found`);
      return;
    }

    // 3. Randomly select a CB-A player
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const replacementPlayer = availablePlayers[randomIndex];

    console.log(`\n🎲 Randomly selected: ${replacementPlayer.basePlayer.name} (index ${randomIndex})`);
    console.log(`   Position: ${replacementPlayer.position}-${replacementPlayer.position_group}`);
    console.log(`   Overall: ${replacementPlayer.overallRating}`);

    // 4. Execute the fix
    console.log(`\n⚠️  READY TO MAKE CHANGES:`);
    console.log(`   1. Delete Zlatan Ibrahimović transfer`);
    console.log(`   2. Create transfer for ${replacementPlayer.basePlayer.name}`);
    console.log(`   3. Budget remains unchanged (same price: £${zlatanTransfer.soldPrice})`);

    await prisma.$transaction(async (tx) => {
      // Get current team budget
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: zlatanTransfer.seasonId,
            teamId: zlatanTransfer.teamId
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

      // Delete Zlatan's transfer
      await tx.transfer_history.delete({
        where: { id: zlatanTransfer.id }
      });
      console.log(`\n   ✅ Deleted Zlatan Ibrahimović transfer`);

      // Refund Zlatan's price
      const refundedBudget = oldBudget + zlatanTransfer.soldPrice;

      // Create new transfer for CB-A player with same price
      const { generateTransferId, generateFinancialId } = await import('../lib/id-generator');
      const newTransferId = await generateTransferId();
      
      await tx.transfer_history.create({
        data: {
          id: newTransferId,
          basePlayerId: replacementPlayer.basePlayerId,
          seasonId: zlatanTransfer.seasonId,
          teamId: zlatanTransfer.teamId,
          roundId: zlatanTransfer.roundId,
          soldPrice: zlatanTransfer.soldPrice,
          acquisitionType: zlatanTransfer.acquisitionType,
          acquisitionNotes: `Fixed allocation: Replaced Rafael Márquez (CB-B) → Zlatan (CF-A, wrong) → ${replacementPlayer.basePlayer.name} (CB-${roundPositionGroup}, correct). Original notes: ${zlatanTransfer.acquisitionNotes || ''}`,
          status: 'ACTIVE'
        }
      });
      console.log(`   ✅ Created transfer for ${replacementPlayer.basePlayer.name}`);

      // Update budget (refund + charge = net zero since same price)
      const finalBudget = refundedBudget - zlatanTransfer.soldPrice;

      await tx.season_teams.update({
        where: {
          seasonId_teamId: {
            seasonId: zlatanTransfer.seasonId,
            teamId: zlatanTransfer.teamId
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
          seasonId: zlatanTransfer.seasonId,
          transactionType: 'ADJUSTMENT',
          amount: zlatanTransfer.soldPrice,
          previousBalance: oldBudget,
          newBalance: refundedBudget,
          description: `Refund for Zlatan Ibrahimović (CF-A, incorrect allocation)`,
          playerName: zlatanTransfer.basePlayer.name
        }
      });

      const ledgerId2 = await generateFinancialId();
      await tx.financial_ledger.create({
        data: {
          id: ledgerId2,
          seasonTeamId: seasonTeam.id,
          seasonId: zlatanTransfer.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -zlatanTransfer.soldPrice,
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
    console.log(`   ❌ Removed: Zlatan Ibrahimović (CF-A, wrong position)`);
    console.log(`   ✅ Added: ${replacementPlayer.basePlayer.name} (CB-${roundPositionGroup}, correct)`);
    console.log(`   💰 Price: £${zlatanTransfer.soldPrice} (unchanged)`);
    console.log(`   🏆 Team: ${zlatanTransfer.team.name}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the fix
revertAndFixAllocation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
