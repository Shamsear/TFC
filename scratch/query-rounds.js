const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying matches details...');
  const matches = await prisma.matches.findMany({
    take: 10,
    select: {
      id: true,
      round: true,
      matchType: true,
      startDate: true,
      matchDate: true
    }
  });

  console.log('Matches sample structure:');
  console.log(JSON.stringify(matches, null, 2));

  // Get distinct round values
  const allMatches = await prisma.matches.findMany({
    select: { round: true }
  });
  const distinctRounds = [...new Set(allMatches.map(m => m.round))];
  console.log('\nDistinct Round values in matches table:');
  console.log(distinctRounds);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
