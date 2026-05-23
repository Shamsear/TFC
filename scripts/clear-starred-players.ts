import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/clear-starred-players.ts <teamId> <seasonId> [apply]');
    console.log('Example: npx tsx scripts/clear-starred-players.ts TFCM-7 TFCS-4 apply');
    process.exit(1);
  }

  const teamId = args[0];
  const seasonId = args[1];
  const mode = args[2] || 'preview';

  // Get season team
  const seasonTeam = await prisma.season_teams.findFirst({
    where: {
      teamId,
      seasonId
    },
    include: {
      team: { select: { name: true } }
    }
  });

  if (!seasonTeam) {
    console.log('❌ Team not found in season');
    return;
  }

  console.log(`\n🔍 ${mode === 'apply' ? 'DELETING' : 'PREVIEW'} starred players for ${seasonTeam.team.name}\n`);

  // Get starred players
  const starredPlayers = await prisma.starred_players.findMany({
    where: {
      seasonTeamId: seasonTeam.id,
      seasonId: seasonId
    },
    include: {
      basePlayer: {
        select: { name: true }
      }
    }
  });

  console.log(`Found ${starredPlayers.length} starred players:\n`);
  starredPlayers.forEach((sp, idx) => {
    console.log(`${idx + 1}. ${sp.basePlayer.name} (${sp.playerId})`);
  });

  if (mode === 'apply') {
    const result = await prisma.starred_players.deleteMany({
      where: {
        seasonTeamId: seasonTeam.id,
        seasonId: seasonId
      }
    });

    console.log(`\n✅ Deleted ${result.count} starred players`);
  } else {
    console.log('\n\n⚠️  This is a PREVIEW. To actually delete, run:');
    console.log(`npx tsx scripts/clear-starred-players.ts ${teamId} ${seasonId} apply`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
