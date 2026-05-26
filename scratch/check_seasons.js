const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const seasons = await prisma.seasons.findMany();
  console.log('Seasons:', seasons);
  await prisma.$disconnect();
}

main().catch(console.error);
