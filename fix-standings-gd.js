const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all standings entries from database...');
  const standings = await prisma.standings.findMany({
    include: {
      seasonTeam: {
        include: {
          team: true
        }
      }
    }
  });

  console.log(`Found ${standings.length} standings entries. Recalculating Goal Differences (GD)...`);
  let correctedCount = 0;

  for (const s of standings) {
    const expectedGD = s.goalsFor - s.goalsAgainst;
    if (s.goalDiff !== expectedGD) {
      const teamName = s.seasonTeam?.team?.name || 'Unknown Team';
      console.log(`Correction needed for Standing ID ${s.id} (${teamName}): Current GD = ${s.goalDiff}, Expected GD = ${expectedGD} (GF: ${s.goalsFor}, GA: ${s.goalsAgainst})`);
      
      await prisma.standings.update({
        where: { id: s.id },
        data: { goalDiff: expectedGD }
      });
      
      correctedCount++;
    }
  }

  console.log(`\nStandings correction complete!`);
  console.log(`Total checked: ${standings.length}`);
  console.log(`Total corrected: ${correctedCount}`);
  
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error running fix standings script:', err);
  process.exit(1);
});
