import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const standings = await prisma.standings.findMany({
    take: 20,
    include: {
      seasonTeam: {
        include: {
          team: true
        }
      },
      tournament: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  if (standings.length === 0) {
    console.log("No standings found in the database.");
    return;
  }

  for (const s of standings) {
    console.log(`Tournament: ${s.tournament.name} (Season: ${s.tournament.seasonId})`);
    console.log(`Team: ${s.seasonTeam.team.name} (Team ID: ${s.teamId})`);
    console.log(`Stats: Played=${s.played}, W=${s.won}, D=${s.drawn}, L=${s.lost}, GF=${s.goalsFor}, GA=${s.goalsAgainst}, Points=${s.points}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
