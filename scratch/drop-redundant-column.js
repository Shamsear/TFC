const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Dropping redundant column is_active from season_teams...');
  await prisma.$executeRaw`ALTER TABLE season_teams DROP COLUMN IF EXISTS is_active`;
  console.log('Successfully dropped is_active column!');
  await prisma.$disconnect();
}

main().catch(console.error);
