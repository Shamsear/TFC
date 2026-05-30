import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.matches.findMany({
    select: { id: true, round: true },
  });

  const roundCounts: Record<string, number> = {};
  for (const m of matches) {
    if (m.round) {
      roundCounts[m.round] = (roundCounts[m.round] || 0) + 1;
    } else {
      roundCounts['NULL'] = (roundCounts['NULL'] || 0) + 1;
    }
  }

  console.log('Round counts:', roundCounts);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
