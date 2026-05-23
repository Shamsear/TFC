import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seasonId = 'TFCS-4';
  const teamId = 'TFCM-7'; // Flamengo
  
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
    console.log('Team not found in season');
    return;
  }

  console.log(`\n🔍 Checking starred players for ${seasonTeam.team.name} (${seasonTeam.id})\n`);

  // Get starred players
  const starredPlayers = await prisma.starred_players.findMany({
    where: {
      seasonTeamId: seasonTeam.id,
      seasonId: seasonId
    },
    include: {
      basePlayer: {
        select: { name: true, id: true }
      }
    }
  });

  console.log(`Found ${starredPlayers.length} starred players:\n`);
  starredPlayers.forEach((sp, idx) => {
    console.log(`${idx + 1}. ${sp.basePlayer.name} (${sp.playerId})`);
    console.log(`   Created: ${sp.createdAt}`);
  });

  // Ask if user wants to delete them
  console.log('\n\nTo delete all these starred players, run:');
  console.log(`npx tsx scripts/clear-starred-players.ts ${teamId} ${seasonId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
