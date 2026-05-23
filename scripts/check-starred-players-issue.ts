import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seasonId = 'TFCS-4';
  
  // Get all teams in the season
  const teams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: { select: { name: true } }
    },
    orderBy: { team: { name: 'asc' } }
  });

  console.log(`\n📊 Checking starred players for ${teams.length} teams in season ${seasonId}\n`);

  for (const team of teams) {
    const starredCount = await prisma.starred_players.count({
      where: {
        seasonTeamId: team.id,
        seasonId: seasonId
      }
    });

    if (starredCount > 0) {
      console.log(`${team.team.name} (${team.id}): ${starredCount} starred players`);
    }
  }

  // Check for any starred_players with mismatched seasonTeamId and seasonId
  console.log('\n\n🔍 Checking for data integrity issues...\n');

  const allStarred = await prisma.starred_players.findMany({
    where: { seasonId },
    include: {
      seasonTeam: {
        include: {
          team: { select: { name: true } }
        }
      }
    }
  });

  const mismatchedRecords = allStarred.filter(sp => sp.seasonTeam.seasonId !== sp.seasonId);
  
  if (mismatchedRecords.length > 0) {
    console.log(`❌ Found ${mismatchedRecords.length} records with mismatched seasonId!`);
    mismatchedRecords.slice(0, 5).forEach(record => {
      console.log(`  - Player ${record.playerId} for team ${record.seasonTeam.team.name}`);
      console.log(`    seasonTeamId: ${record.seasonTeamId}, seasonId in record: ${record.seasonId}, seasonId in season_teams: ${record.seasonTeam.seasonId}`);
    });
  } else {
    console.log('✅ No data integrity issues found');
  }

  // Check total starred players per team
  console.log('\n\n📈 Total starred players by team:\n');
  
  const teamCounts = await prisma.starred_players.groupBy({
    by: ['seasonTeamId'],
    where: { seasonId },
    _count: true
  });

  for (const count of teamCounts) {
    const team = teams.find(t => t.id === count.seasonTeamId);
    if (team) {
      console.log(`${team.team.name}: ${count._count} starred players`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
