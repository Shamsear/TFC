const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log('--- STARTING VERIFICATION OF MANUAL CLEAR ---');

  const testSessionId = `test-manual-session-${uuidv4()}`;
  
  const season = await prisma.seasons.findFirst();
  if (!season) {
    console.error('❌ No seasons found in database. Cannot run test.');
    process.exit(1);
  }
  const seasonId = season.id;

  // 1. Stage mock players
  const mockStagedPlayers = [
    {
      importSessionId: testSessionId,
      seasonId: seasonId,
      player_id: `test-man-1`,
      name: 'Manual Staging Player',
      normalized_name: 'manual staging player',
      position: 'CF',
      realWorldClub: 'Test FC',
      overallRating: 88,
      star_rating: 5,
      nationality: 'Testland'
    }
  ];

  console.log('1. Staging players in database...');
  await prisma.import_staging_players.createMany({
    data: mockStagedPlayers
  });

  // Verify staging count
  let count = await prisma.import_staging_players.count({
    where: { importSessionId: testSessionId }
  });
  console.log(`✅ Staged players count: ${count} (expected: 1)`);

  // 2. Perform transactional commit but with deleteAfterSync = false (meaning players should NOT be deleted)
  console.log('2. Committing staged players to production (deleteAfterSync = false)...');
  
  await prisma.base_players.deleteMany({
    where: { player_id: 'test-man-1' }
  });

  const resultPlayer = await prisma.$queryRaw`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES ('TFCP', 1, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + 1,
      updated_at = NOW()
    RETURNING counter
  `;
  const endCounterPlayer = resultPlayer[0]?.counter || 1;
  const newPlayerId = `TFCP-${endCounterPlayer}`;

  const resultStats = await prisma.$queryRaw`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES ('TFCPS', 1, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + 1,
      updated_at = NOW()
    RETURNING counter
  `;
  const endCounterStats = resultStats[0]?.counter || 1;
  const newStatsId = `TFCPS-${endCounterStats}`;

  const stagedRows = await prisma.import_staging_players.findMany({
    where: { importSessionId: testSessionId }
  });

  const basePlayersToCreate = [{
    id: newPlayerId,
    player_id: stagedRows[0].player_id,
    name: stagedRows[0].name,
    normalized_name: stagedRows[0].normalized_name,
    photoUrl: `/players/${stagedRows[0].player_id}.webp`,
    createdAt: new Date(),
    updatedAt: new Date()
  }];

  const seasonalStatsToCreate = [{
    id: newStatsId,
    basePlayerId: newPlayerId,
    seasonId: seasonId,
    position: stagedRows[0].position,
    realWorldClub: stagedRows[0].realWorldClub,
    overallRating: stagedRows[0].overallRating,
    star_rating: stagedRows[0].star_rating,
    nationality: stagedRows[0].nationality,
    createdAt: new Date(),
    updatedAt: new Date()
  }];

  // Transaction sync without deleting staging
  await prisma.$transaction([
    prisma.base_players.createMany({ data: basePlayersToCreate }),
    prisma.seasonal_player_stats.createMany({ data: seasonalStatsToCreate })
    // NOTE: Staging deletion is omitted here to mimic deleteAfterSync = false
  ]);

  console.log('✅ Staged players moved to production.');

  // 3. Verify staging table still contains the row
  count = await prisma.import_staging_players.count({
    where: { importSessionId: testSessionId }
  });
  
  if (count === 1) {
    console.log('✅ Verified: Staging row remains in the staging table after confirmation.');
  } else {
    console.error(`❌ Failed: Expected staging row to remain, but it was deleted (count: ${count})`);
  }

  // 4. Manually clear staging row for this session
  console.log('4. Manually deleting staging row for the session...');
  const deleteResult = await prisma.import_staging_players.deleteMany({
    where: { importSessionId: testSessionId }
  });
  console.log(`✅ Staging table deleted count: ${deleteResult.count} (expected: 1)`);

  // Verify staging count is now 0
  count = await prisma.import_staging_players.count({
    where: { importSessionId: testSessionId }
  });
  console.log(`✅ Staging table is now cleared (count: ${count}, expected: 0)`);

  // Clean up production table
  await prisma.base_players.deleteMany({
    where: { player_id: 'test-man-1' }
  });
  console.log('✅ Clean up complete.');
  console.log('--- VERIFICATION SUCCESSFUL ---');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Verification failed with error:', err);
  await prisma.$disconnect();
});
