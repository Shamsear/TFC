const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.transfer_history.findMany({
    where: { basePlayerId: 'TFCP-332' }
  });
  console.log('Transfers for TFCP-332:', transfers);
  await prisma.$disconnect();
}

main().catch(console.error);
