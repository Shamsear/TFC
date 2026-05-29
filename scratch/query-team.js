const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying team TFCM-7...');
  const team = await prisma.teams.findUnique({
    where: { id: 'TFCM-7' },
    include: {
      unlockedBadges: true,
    }
  });

  console.log('Team data:', JSON.stringify(team, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
