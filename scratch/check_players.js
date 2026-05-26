const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const player = await prisma.base_players.findFirst();
  console.log('Player sample:', player);
  await prisma.$disconnect();
}

main().catch(console.error);
