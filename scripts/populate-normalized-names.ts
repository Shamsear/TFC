import { PrismaClient } from '@prisma/client';
import { normalizeString } from '../lib/search-utils';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to populate normalized names...');

  const players = await prisma.base_players.findMany({
    select: {
      id: true,
      name: true
    }
  });

  console.log(`Found ${players.length} players to process`);

  let updated = 0;
  for (const player of players) {
    const normalizedName = normalizeString(player.name);
    
    await prisma.base_players.update({
      where: { id: player.id },
      data: { normalized_name: normalizedName }
    });

    updated++;
    if (updated % 100 === 0) {
      console.log(`Processed ${updated}/${players.length} players...`);
    }
  }

  console.log(`✓ Successfully updated ${updated} players with normalized names`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
