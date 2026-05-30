import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.base_players.findMany({
    take: 5,
    select: { name: true, photoUrl: true }
  });
  console.log(players);
}
main().finally(() => prisma.$disconnect());
