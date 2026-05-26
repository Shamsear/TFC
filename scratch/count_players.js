const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.base_players.count();
  const nullPlayerId = await prisma.base_players.count({ where: { player_id: null } });
  console.log(`Total players: ${total}, players with null player_id: ${nullPlayerId}`);
  await prisma.$disconnect();
}

main().catch(console.error);
