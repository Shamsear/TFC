import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const transfers = await prisma.transfer_history.findMany({
    take: 10,
    include: {
      team: true,
      basePlayer: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (transfers.length === 0) {
    console.log("No transfer history found.");
    return;
  }

  for (const t of transfers) {
    console.log(`Team: ${t.team.name} | Player: ${t.basePlayer.name} | Price: ${t.soldPrice} | Type: ${t.acquisitionType}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
