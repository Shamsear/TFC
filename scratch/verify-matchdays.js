const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching verification samples from different rounds...');
  const roundsToCheck = ['Matchday 1', 'Matchday 2', 'Matchday 16', 'Matchday 58'];
  
  for (const r of roundsToCheck) {
    const match = await prisma.matches.findFirst({
      where: { round: r },
      select: { id: true, round: true, startDate: true, matchDate: true }
    });
    
    if (match) {
      console.log(`Round: ${match.round} | ID: ${match.id} | Start: ${match.startDate} | Deadline: ${match.matchDate}`);
    } else {
      console.log(`No match found for ${r}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
