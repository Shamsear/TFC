import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.matches.findMany({
    select: { id: true, round: true },
  });

  const idsToDelete: string[] = [];

  for (const m of matches) {
    if (m.round && m.round.startsWith('Matchday ')) {
      const day = parseInt(m.round.replace('Matchday ', ''), 10);
      if (!isNaN(day) && day >= 30 && day <= 58) {
        idsToDelete.push(m.id);
      }
    }
  }

  console.log(`Found ${idsToDelete.length} matches to delete from Matchday 30 to 58.`);

  if (idsToDelete.length > 0) {
    const res = await prisma.matches.deleteMany({
      where: {
        id: {
          in: idsToDelete,
        },
      },
    });
    console.log(`Deleted ${res.count} matches successfully.`);
  } else {
    console.log('No matches found in that range.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
