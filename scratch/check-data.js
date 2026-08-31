const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT 
      SUM(CASE WHEN "isActive" = true THEN 1 ELSE 0 END) as camel_active,
      SUM(CASE WHEN "isActive" = false THEN 1 ELSE 0 END) as camel_inactive,
      SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as snake_active,
      SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as snake_inactive
    FROM season_teams
  `;
  console.log('Active counts by column:', result);
  await prisma.$disconnect();
}

main().catch(console.error);
