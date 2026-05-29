const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying all matches from the database...');
  const matches = await prisma.matches.findMany();
  console.log(`Found ${matches.length} matches. Shifting to linear date progression (Matchday N -> June N)...`);

  let count = 0;
  for (const match of matches) {
    const updatedData = {};
    
    // Parse Matchday number from round string (e.g. "Matchday 15" -> 15)
    let matchdayNum = 1;
    if (match.round && match.round.toLowerCase().startsWith('matchday')) {
      const parsed = parseInt(match.round.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) {
        matchdayNum = parsed;
      }
    }

    // 1. Shift startDate safely to June N, 2026, preserving time
    if (match.startDate) {
      const origStartDate = new Date(match.startDate);
      const newStartDate = new Date(origStartDate);
      
      // AVOID the JS setMonth/setDate rollover bug by setting day to a safe "1" first
      newStartDate.setDate(1);
      newStartDate.setMonth(5); // June is 0-indexed month 5
      newStartDate.setFullYear(2026);
      newStartDate.setDate(matchdayNum); // June N
      
      updatedData.startDate = newStartDate;
    } else {
      // In case startDate is null, initialize it safely to June N
      const defaultStartDate = new Date();
      defaultStartDate.setDate(1);
      defaultStartDate.setMonth(5);
      defaultStartDate.setFullYear(2026);
      defaultStartDate.setDate(matchdayNum);
      defaultStartDate.setHours(13, 30, 0, 0);
      updatedData.startDate = defaultStartDate;
    }

    // 2. Shift matchDate safely to June (N + 1), 2026, preserving time
    if (match.matchDate) {
      const origMatchDate = new Date(match.matchDate);
      const newMatchDate = new Date(origMatchDate);
      
      // AVOID the JS setMonth/setDate rollover bug by setting day to a safe "1" first
      newMatchDate.setDate(1);
      newMatchDate.setMonth(5); // June is 0-indexed month 5
      newMatchDate.setFullYear(2026);
      newMatchDate.setDate(matchdayNum + 1); // June N + 1
      
      updatedData.matchDate = newMatchDate;
    }

    // Perform database update
    await prisma.matches.update({
      where: { id: match.id },
      data: updatedData
    });

    count++;
    if (count % 100 === 0) {
      console.log(`Linearly updated dates for ${count} matches...`);
    }
  }

  console.log(`\nLinear date shifting completed successfully!`);
  console.log(`Total matches updated: ${count}`);

  // Query verification samples from different Matchdays to verify new linear progression
  console.log('\nVerifying date adjustments (samples from Matchday 1, 2, 16, 58):');
  const roundsToCheck = ['Matchday 1', 'Matchday 2', 'Matchday 16', 'Matchday 58'];
  for (const r of roundsToCheck) {
    const s = await prisma.matches.findFirst({
      where: { round: r },
      select: { id: true, round: true, startDate: true, matchDate: true }
    });
    if (s) {
      console.log(`Round: ${s.round} | ID: ${s.id} | New StartDate: ${s.startDate} | New MatchDate: ${s.matchDate}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
