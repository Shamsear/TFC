const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying first 5 matches...');
  const matches = await prisma.matches.findMany({
    take: 5
  });

  console.log('Matches list:');
  matches.forEach(m => {
    console.log(`ID: ${m.id} | StartDate: ${m.startDate} | MatchDate: ${m.matchDate}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
