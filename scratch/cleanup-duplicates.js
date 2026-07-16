const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Duplicates Cleanup ---');
  const deleted = await prisma.auction_settings.delete({
    where: {
      id: 2
    }
  });
  console.log('Deleted duplicate record:', deleted);
  console.log('--- Cleanup Completed ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
