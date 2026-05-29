import { prisma } from '../lib/prisma';

async function main() {
  const teamCount = await prisma.teams.count();
  const matchCount = await prisma.matches.count();
  const completedMatchCount = await prisma.matches.count({
    where: { status: 'COMPLETED' }
  });
  const seasonTeamCount = await prisma.season_teams.count();
  
  console.log('--- DATABASE DIAGNOSTICS ---');
  console.log(`Teams: ${teamCount}`);
  console.log(`Season Teams: ${seasonTeamCount}`);
  console.log(`Total Matches: ${matchCount}`);
  console.log(`Completed Matches: ${completedMatchCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
