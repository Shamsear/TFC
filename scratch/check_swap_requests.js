const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.swap_requests.findFirst({
    include: {
      players: {
        include: {
          basePlayer: true
        }
      }
    }
  });
  if (req) {
    console.log('Swap request sample:', req);
    req.players.forEach(p => {
      console.log(`Player: ${p.playerName}, player_id: ${p.basePlayer.player_id}, id: ${p.basePlayer.id}`);
    });
  } else {
    console.log('No swap requests found in DB.');
  }
  await prisma.$disconnect();
}

main().catch(console.error);
