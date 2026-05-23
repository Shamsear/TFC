import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.season_teams.findFirst({
    where: {
      team: { name: 'AC Milan' },
      seasonId: 'TFCS-4'
    },
    select: {
      id: true,
      currentBudget: true
    }
  });

  console.log('AC Milan currentBudget:', team?.currentBudget);

  const lastLedger = await prisma.financial_ledger.findFirst({
    where: { seasonTeamId: team?.id },
    orderBy: { createdAt: 'desc' },
    select: { newBalance: true, description: true, createdAt: true }
  });

  console.log('Last ledger entry:', lastLedger);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
