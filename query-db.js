const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying Preview Allocations...');

  const previews = await prisma.preview_allocations.findMany({
    include: {
      team: { select: { name: true } },
      basePlayer: { select: { name: true } }
    }
  });

  console.log('\n--- Preview Allocations ---');
  previews.forEach(p => {
    console.log(`  - Team: ${p.team.name}, Player: ${p.basePlayer.name}, Round ID: ${p.roundId}, Price: £${p.amount}, Acquisition: ${p.acquisitionType}, Notes: ${p.acquisitionNotes}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
