const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'season_teams'
  `;
  console.log('Columns in season_teams table:', result);
  await prisma.$disconnect();
}

main().catch(console.error);
