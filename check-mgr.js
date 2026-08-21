const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const managers = await prisma.managers.findMany({
    where: { name: { in: ['Anwar', 'Anvar', 'Shadow'] } }
  });
  console.log("Managers:", managers);
}
main().finally(() => prisma.$disconnect());
