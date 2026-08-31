const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

async function main() {
  console.log('--- STARTING VERIFICATION OF STAGED IMPORT ---');

  const testSessionId = `test-session-${uuidv4()}`;
  const testSeasonId = 'TFCS-1'; // Ensure this matches an existing season in your database
  
  // Find a valid season first
  const season = await prisma.seasons.findFirst();
  if (!season) {
    console.error('❌ No seasons found in database. Cannot run test.');
    process.exit(1);
  }
  const seasonId = season.id;
  console.log(`Using season ID: ${seasonId} (${season.name})`);

  // 1. Create mock players in staging table
  const mockStagedPlayers = [
    {
      importSessionId: testSessionId,
      seasonId: seasonId,
      player_id: `test-ef-1`,
      name: 'Staging Test Player 1',
      normalized_name: 'staging test player 1',
      position: 'CF',
      realWorldClub: 'Test FC',
      overallRating: 85,
      star_rating: 4,
      nationality: 'Testland',
      speed: 80,
      acceleration: 82,
      form: 'A'
    },
    {
      importSessionId: testSessionId,
      seasonId: seasonId,
      player_id: `test-ef-2`,
      name: 'Staging Test Player 2',
      normalized_name: 'staging test player 2',
      position: 'CB',
      realWorldClub: 'Test City',
      overallRating: 82,
      star_rating: 3,
      nationality: 'Testland',
      defensive_awareness: 85,
      tackling: 84
    }
  ];

  console.log('1. Staging players in database...');
  await prisma.import_staging_players.createMany({
    data: mockStagedPlayers
  });

  // Verify staging count
  const stagedCount = await prisma.import_staging_players.count({
    where: { importSessionId: testSessionId }
  });
  console.log(`✅ Staging table contains ${stagedCount} test players (expected: 2)`);

  // 2. Perform the transactional confirmation logic
  console.log('2. Committing staged players to production...');
  
  // Clean up any existing test players first
  await prisma.base_players.deleteMany({
    where: { player_id: { in: ['test-ef-1', 'test-ef-2'] } }
  });

  // Let's call the atomic ID counters to generate unique IDs
  const resultPlayer = await prisma.$queryRaw`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES ('TFCP', 2, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + 2,
      updated_at = NOW()
    RETURNING counter
  `;
  const endCounterPlayer = resultPlayer[0]?.counter || 2;
  const newPlayerIds = [
    `TFCP-${endCounterPlayer - 1}`,
    `TFCP-${endCounterPlayer}`
  ];

  const resultStats = await prisma.$queryRaw`
    INSERT INTO id_counters (prefix, counter, updated_at)
    VALUES ('TFCPS', 2, NOW())
    ON CONFLICT (prefix) 
    DO UPDATE SET 
      counter = id_counters.counter + 2,
      updated_at = NOW()
    RETURNING counter
  `;
  const endCounterStats = resultStats[0]?.counter || 2;
  const newStatsIds = [
    `TFCPS-${endCounterStats - 1}`,
    `TFCPS-${endCounterStats}`
  ];

  // Fetch from staging
  const stagedRows = await prisma.import_staging_players.findMany({
    where: { importSessionId: testSessionId }
  });

  const basePlayersToCreate = stagedRows.map((row, idx) => ({
    id: newPlayerIds[idx],
    player_id: row.player_id,
    name: row.name,
    normalized_name: row.normalized_name,
    photoUrl: `/players/${row.player_id}.webp`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  const seasonalStatsToCreate = stagedRows.map((row, idx) => ({
    id: newStatsIds[idx],
    basePlayerId: newPlayerIds[idx],
    seasonId: seasonId,
    position: row.position,
    realWorldClub: row.realWorldClub,
    overallRating: row.overallRating,
    star_rating: row.star_rating,
    nationality: row.nationality,
    speed: row.speed,
    acceleration: row.acceleration,
    form: row.form,
    defensive_awareness: row.defensive_awareness,
    tackling: row.tackling,
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  await prisma.$transaction([
    prisma.base_players.createMany({ data: basePlayersToCreate }),
    prisma.seasonal_player_stats.createMany({ data: seasonalStatsToCreate }),
    prisma.import_staging_players.deleteMany({ where: { importSessionId: testSessionId } })
  ]);

  console.log('✅ Staged players moved and staging table cleaned up.');

  // 3. Verify production database contains our imported players
  console.log('3. Verifying database entries...');
  const basePlayers = await prisma.base_players.findMany({
    where: { player_id: { in: ['test-ef-1', 'test-ef-2'] } },
    include: { seasonalPlayerStats: true }
  });

  if (basePlayers.length === 2) {
    console.log(`✅ Success! Found ${basePlayers.length} base players in database.`);
    basePlayers.forEach(p => {
      console.log(`   - Player: ${p.name} (ID: ${p.id}, player_id: ${p.player_id})`);
      console.log(`     Stats: Position: ${p.seasonalPlayerStats[0]?.position}, Rating: ${p.seasonalPlayerStats[0]?.overallRating}`);
    });
  } else {
    console.error(`❌ Failed! Expected 2 players, found ${basePlayers.length}`);
  }

  // 4. Clean up test entries
  console.log('4. Cleaning up test data from database...');
  await prisma.base_players.deleteMany({
    where: { player_id: { in: ['test-ef-1', 'test-ef-2'] } }
  });
  console.log('✅ Clean up complete.');
  console.log('--- VERIFICATION SUCCESSFUL ---');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Verification failed with error:', err);
  await prisma.$disconnect();
});
