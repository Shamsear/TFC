const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teamseasons = await prisma.season_teams.findMany({
    include: {
      team: { select: { name: true } }
    }
  });
  console.log('Team Seasons sample:', teamseasons.slice(0, 3));
  await prisma.$disconnect();
}

main().catch(console.error);
