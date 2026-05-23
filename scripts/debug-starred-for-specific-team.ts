import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seasonId = 'TFCS-4';
  
  // Show all teams and their IDs
  console.log('\n📋 All teams in season:\n');
  const teams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: { select: { name: true, id: true } }
    },
    orderBy: { team: { name: 'asc' } }
  });

  teams.forEach(st => {
    console.log(`${st.team.name}:`);
    console.log(`  - Team ID (teams table): ${st.team.id}`);
    console.log(`  - Season Team ID: ${st.id}`);
  });

  // Check Liverpool specifically (259 starred players)
  console.log('\n\n🔍 Liverpool Details:\n');
  const liverpool = teams.find(t => t.team.name === 'Liverpool');
  if (liverpool) {
    const starredPlayers = await prisma.starred_players.findMany({
      where: {
        seasonTeamId: liverpool.id,
        seasonId: seasonId
      },
      select: {
        playerId: true,
        basePlayer: {
          select: { name: true }
        }
      },
      take: 10
    });

    console.log(`Liverpool has ${starredPlayers.length} starred players (showing first 10):`);
    starredPlayers.forEach((sp, idx) => {
      console.log(`  ${idx + 1}. ${sp.basePlayer.name} (${sp.playerId})`);
    });
  }

  // Check which team has the user you're testing with
  console.log('\n\n👤 Checking users and their teams:\n');
  const users = await prisma.users.findMany({
    where: {
      role: 'TEAM_MANAGER'
    },
    select: {
      email: true,
      teamId: true,
      team: {
        select: { name: true }
      }
    }
  });

  users.forEach(user => {
    console.log(`${user.email} -> ${user.team?.name || 'No team'} (teamId: ${user.teamId})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
