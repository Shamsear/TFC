// migrate-legacy-releases.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function generateIds(prefix, count) {
  if (count <= 0) return [];
  
  const result = await prisma.$queryRawUnsafe(`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + $2,
      updated_at = NOW()
    RETURNING counter
  `, prefix, count)

  const endCounter = result[0]?.counter || count;
  const startCounter = endCounter - count + 1;
  
  const ids = [];
  for (let i = startCounter; i <= endCounter; i++) {
    ids.push(`${prefix}-${i}`);
  }
  
  return ids;
}

async function main() {
  const seasonsWithRequests = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT season_id FROM release_requests WHERE release_window_id IS NULL
  `);

  let totalUpdated = 0

  for (const row of seasonsWithRequests) {
    const seasonId = row.season_id;
    
    // Create a legacy window
    const [windowId] = await generateIds('TFCRW', 1)
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO release_windows (id, season_id, name, start_date, end_date, status, created_at, updated_at)
      VALUES ($1, $2, 'Legacy Window', '2020-01-01', '2030-01-01', 'CLOSED', NOW(), NOW())
    `, windowId, seasonId)
    
    // Update all release requests for this season
    const count = await prisma.$executeRawUnsafe(`
      UPDATE release_requests 
      SET release_window_id = $1 
      WHERE season_id = $2 AND release_window_id IS NULL
    `, windowId, seasonId)
    
    console.log(`Created Legacy Window ${windowId} for season ${seasonId} and assigned release requests.`)
    totalUpdated += count
  }

  console.log(`Migration complete.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
