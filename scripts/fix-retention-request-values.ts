import { prisma } from '../lib/prisma';

/**
 * Fix retention request oldSquadValue values
 * 
 * For each retention_request, resolves the manager's team in the previous
 * season (managers can change teams between seasons) and looks up the
 * correct soldPrice from transfer_history, then updates oldSquadValue.
 */

async function getManagerPreviousTeamId(
  currentTeamId: string,
  currentSeasonId: string,
  previousSeasonId: string
): Promise<string | null> {
  // Get the manager name for this team in the current season
  const currentSt = await prisma.season_teams.findFirst({
    where: { seasonId: currentSeasonId, teamId: currentTeamId },
    select: { managerName: true },
  });

  if (!currentSt?.managerName) return null;

  // Find which team this manager was on in the previous season
  const prevSt = await prisma.season_teams.findFirst({
    where: {
      seasonId: previousSeasonId,
      managerName: { equals: currentSt.managerName, mode: 'insensitive' },
    },
    select: { teamId: true },
  });

  return prevSt?.teamId || null;
}

async function fixRetentionValues() {
  console.log('\n🔧 Fixing retention request oldSquadValue values...\n');

  try {
    // Get all pending retention requests
    const pendingRequests = await prisma.retention_requests.findMany({
      where: { status: 'pending' },
      include: {
        previousSeason: { select: { id: true, name: true } },
        season: { select: { id: true } },
      },
    });

    console.log(`📋 Found ${pendingRequests.length} pending retention requests\n`);

    if (pendingRequests.length === 0) {
      console.log('No pending requests to fix.');
      return;
    }

    let updated = 0;
    let unchanged = 0;
    let noTransferFound = 0;
    const details: Array<{
      playerName: string;
      oldValue: number;
      newValue: number;
      previousSeason: string;
    }> = [];

    for (const req of pendingRequests) {
      // Resolve the manager's team in the previous season
      const previousTeamId = await getManagerPreviousTeamId(
        req.teamId,
        req.seasonId,
        req.previousSeasonId
      );

      // Try with resolved previous team first, then fall back to current teamId
      const lookupTeamId = previousTeamId || req.teamId;

      const transfer = await prisma.transfer_history.findFirst({
        where: {
          seasonId: req.previousSeasonId,
          basePlayerId: req.playerId,
          teamId: lookupTeamId,
          status: 'ACTIVE',
        },
        select: { soldPrice: true },
      });

      if (!transfer) {
        console.log(`⚠️  No transfer found for ${req.playerName} (${req.playerId}) in ${req.previousSeason.name}`);
        noTransferFound++;
        continue;
      }

      const correctValue = transfer.soldPrice;

      if (req.oldSquadValue !== correctValue) {
        await prisma.retention_requests.update({
          where: { id: req.id },
          data: { oldSquadValue: correctValue },
        });

        details.push({
          playerName: req.playerName,
          teamId: req.teamId,
          oldValue: req.oldSquadValue,
          newValue: correctValue,
          previousSeason: req.previousSeason.name,
        });

        console.log(`✅ ${req.playerName}: £${req.oldSquadValue.toLocaleString()} → £${correctValue.toLocaleString()} (${req.previousSeason.name})`);
        updated++;
      } else {
        unchanged++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('                           RETENTION VALUE FIX SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log(`Total pending requests:   ${pendingRequests.length}`);
    console.log(`Updated:                  ${updated} ✅`);
    console.log(`Already correct:          ${unchanged} ⏭️`);
    console.log(`No transfer found:        ${noTransferFound} ⚠️`);
    console.log('');

    if (details.length > 0) {
      console.log('Updated requests:');
      for (const d of details) {
        console.log(`  ${d.playerName.padEnd(30)} £${d.oldValue.toLocaleString().padStart(8)} → £${d.newValue.toLocaleString().padStart(8)}  (${d.previousSeason})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

fixRetentionValues()
  .then(() => {
    console.log('✅ Fix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
