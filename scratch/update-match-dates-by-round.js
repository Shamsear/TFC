const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying all matches from the database...');
  const matches = await prisma.matches.findMany();
  console.log(`Found ${matches.length} matches. Adjusting dates sequentially by Matchday...`);

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

    const daysToAdd = (matchdayNum - 1) * 2;

    // 1. Shift startDate to June (1 + daysToAdd), 2026, preserving original time
    if (match.startDate) {
      const origStartDate = new Date(match.startDate);
      const newStartDate = new Date(origStartDate);
      newStartDate.setFullYear(2026);
      newStartDate.setMonth(5); // June is 0-indexed month 5
      newStartDate.setDate(1 + daysToAdd); // JavaScript handles calendar overflows automatically
      updatedData.startDate = newStartDate;
    } else {
      // In case startDate is null, initialize it to June (1 + daysToAdd) at 13:30:00 (default)
      const defaultStartDate = new Date();
      defaultStartDate.setFullYear(2026);
      defaultStartDate.setMonth(5);
      defaultStartDate.setDate(1 + daysToAdd);
      defaultStartDate.setHours(13, 30, 0, 0);
      updatedData.startDate = defaultStartDate;
    }

    // 2. Shift matchDate to June (2 + daysToAdd), 2026, preserving original time
    if (match.matchDate) {
      const origMatchDate = new Date(match.matchDate);
      const newMatchDate = new Date(origMatchDate);
      newMatchDate.setFullYear(2026);
      newMatchDate.setMonth(5); // June is 0-indexed month 5
      newMatchDate.setDate(2 + daysToAdd); // JavaScript handles calendar overflows automatically
      updatedData.matchDate = newMatchDate;
    }

    // Perform database update
    await prisma.matches.update({
      where: { id: match.id },
      data: updatedData
    });

    count++;
    if (count % 100 === 0) {
      console.log(`Sequentially updated dates for ${count} matches...`);
    }
  }

  console.log(`\nSequential date adjustments completed successfully!`);
  console.log(`Total matches updated: ${count}`);

  // Query a few samples to verify different matchdays
  console.log('\nVerifying date adjustments (samples from Matchday 1, 2, 16):');
  const samples = await prisma.matches.findMany({
    where: {
      round: {
        in: ['Matchday 1', 'Matchday 2', 'Matchday 16']
      }
    },
    take: 6,
    orderBy: {
      round: 'asc'
    }
  });
  
  samples.forEach(s => {
    console.log(`ID: ${s.id} | Round: ${s.round} | New StartDate: ${s.startDate} | New MatchDate: ${s.matchDate}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
