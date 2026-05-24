import { prisma } from '../lib/prisma';

/**
 * Swap Pierre Will Delibes with Yankuba Minteh for Girona
 * Replace Pierre's transfer with Yankuba's transfer (same price, no budget change)
 */

async function swapGironaPlayers() {
  console.log('\n🔄 Swapping Girona Players...\n');

  try {
    const seasonId = 'TFCS-4';

    // 1. Find Pierre Will Delibes
    const pierre = await prisma.base_players.findFirst({
      where: {
        name: {
          contains: 'Pierre',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!pierre) {
      console.log('❌ Pierre not found');
      return;
    }

    console.log(`✅ Found: ${pierre.name} (${pierre.id})`);

    // 2. Find Pierre's transfer to Girona
    const pierreTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: pierre.id,
        seasonId: seasonId,
        team: {
          name: 'Girona'
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
        }
      }
    });

    if (!pierreTransfer) {
      console.log('❌ Pierre transfer to Girona not found');
      return;
    }

    console.log(`\n📋 Pierre's Transfer:`);
    console.log(`   Team: ${pierreTransfer.team.name}`);
    console.log(`   Round: ${pierreTransfer.round?.roundNumber} (${pierreTransfer.round?.position_group})`);
    console.log(`   Price: £${pierreTransfer.soldPrice}`);
    console.log(`   Acquisition: ${pierreTransfer.acquisitionType}`);

    // 3. Find Yankuba Minteh
    const yankuba = await prisma.base_players.findFirst({
      where: {
        name: {
          contains: 'Yankuba Minteh',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!yankuba) {
      console.log('\n❌ Yankuba Minteh not found');
      return;
    }

    console.log(`\n✅ Found: ${yankuba.name} (${yankuba.id})`);

    // 4. Check if Yankuba is already sold
    const yankubaExistingTransfer = await prisma.transfer_history.findFirst({
      where: {
        basePlayerId: yankuba.id,
        seasonId: seasonId
      }
    });

    if (yankubaExistingTransfer) {
      console.log(`⚠️  Warning: Yankuba already has a transfer in this season`);
    }

    // 5. Get Yankuba's stats to verify position
    const yankubaStats = await prisma.seasonal_player_stats.findFirst({
      where: {
        basePlayerId: yankuba.id,
        seasonId: seasonId
      },
      select: {
        position: true,
        position_group: true,
        overallRating: true
      }
    });

    if (yankubaStats) {
      console.log(`\n📊 Yankuba's Stats:`);
      console.log(`   Position: ${yankubaStats.position}`);
      console.log(`   Position Group: ${yankubaStats.position_group}`);
      console.log(`   Overall: ${yankubaStats.overallRating}`);
    }

    // 6. Execute the swap
    console.log(`\n⚠️  READY TO SWAP:`);
    console.log(`   1. Delete Pierre Will Delibes transfer`);
    console.log(`   2. Create Yankuba Minteh transfer (same price: £${pierreTransfer.soldPrice})`);
    console.log(`   3. No budget change (same price)`);

    await prisma.$transaction(async (tx) => {
      // Delete Pierre's transfer
      await tx.transfer_history.delete({
        where: { id: pierreTransfer.id }
      });
      console.log(`\n   ✅ Deleted Pierre Will Delibes transfer`);

      // Create Yankuba's transfer with same details
      const { generateTransferId } = await import('../lib/id-generator');
      const newTransferId = await generateTransferId();
      
      await tx.transfer_history.create({
        data: {
          id: newTransferId,
          basePlayerId: yankuba.id,
          seasonId: pierreTransfer.seasonId,
          teamId: pierreTransfer.teamId,
          roundId: pierreTransfer.roundId,
          soldPrice: pierreTransfer.soldPrice,
          acquisitionType: pierreTransfer.acquisitionType,
          acquisitionNotes: `Swapped: Pierre Will Delibes → Yankuba Minteh (same price, no budget change). Original notes: ${pierreTransfer.acquisitionNotes || ''}`,
          status: 'ACTIVE'
        }
      });
      console.log(`   ✅ Created Yankuba Minteh transfer`);

      // Note: No budget change needed since same price
      console.log(`   ✅ Budget unchanged (same price: £${pierreTransfer.soldPrice})`);
    });

    console.log(`\n✅ SWAP COMPLETE!`);
    console.log(`\n📊 Summary:`);
    console.log(`   ❌ Removed: ${pierre.name}`);
    console.log(`   ✅ Added: ${yankuba.name}`);
    console.log(`   💰 Price: £${pierreTransfer.soldPrice} (unchanged)`);
    console.log(`   🏆 Team: ${pierreTransfer.team.name}`);
    console.log(`   📍 Round: ${pierreTransfer.round?.roundNumber}`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

// Run the swap
swapGironaPlayers()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
