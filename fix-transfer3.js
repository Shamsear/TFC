
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const player = await prisma.base_players.findFirst({
    where: { name: { contains: 'Kaynan Versolato' } },
  });
  console.log('Kaynan Versolato:', player);

  if (!player) return;

  const transfer = await prisma.transfer_history.findFirst({
    where: { basePlayerId: player.id },
    include: { team: true }
  });
  console.log('Transfer:', transfer);
  if (!transfer) {
    console.log('Transfer not found');
    return;
  }

  const seasonId = transfer.seasonId;
  const playerStats = await prisma.seasonal_player_stats.findFirst({
    where: { basePlayerId: player.id, seasonId: seasonId }
  });
  
  if (!playerStats) {
    console.log('No seasonal stats found for this player');
    return;
  }
  
  const position = playerStats.position;
  console.log('Player Position:', position);

  // Find unsold player in same position
  const unsoldPlayers = await prisma.seasonal_player_stats.findMany({
    where: {
      seasonId: seasonId,
      position: position,
      basePlayer: {
        transferHistory: { none: { seasonId: seasonId } }
      }
    },
    include: { basePlayer: true }
  });

  if (unsoldPlayers.length === 0) {
    console.log('No unsold players found in position ' + position);
    return;
  }

  const randomPlayer = unsoldPlayers[Math.floor(Math.random() * unsoldPlayers.length)];
  console.log('Random unsold ' + position + ':', randomPlayer.basePlayer);

  // Update transfer history
  await prisma.transfer_history.update({
    where: { id: transfer.id },
    data: { basePlayerId: randomPlayer.basePlayerId }
  });

  console.log('Successfully updated transfer to:', randomPlayer.basePlayer.name);
}
main().catch(console.error).finally(() => prisma.$disconnect());

