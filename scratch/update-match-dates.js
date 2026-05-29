const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying all matches from the database...');
  const matches = await prisma.matches.findMany();
  console.log(`Found ${matches.length} matches. Shifting dates...`);

  let count = 0;
  for (const match of matches) {
    const updatedData = {};

    // 1. Shift startDate to June 1, 2026, preserving original time
    if (match.startDate) {
      const origStartDate = new Date(match.startDate);
      const newStartDate = new Date(origStartDate);
      newStartDate.setFullYear(2026);
      newStartDate.setMonth(5); // June is 0-indexed month 5
      newStartDate.setDate(1);  // 1st of the month
      updatedData.startDate = newStartDate;
    } else {
      // In case it's null, initialize it to June 1, 2026 at 13:30:00 (default)
      const defaultStartDate = new Date();
      defaultStartDate.setFullYear(2026);
      defaultStartDate.setMonth(5);
      defaultStartDate.setDate(1);
      defaultStartDate.setHours(13, 30, 0, 0);
      updatedData.startDate = defaultStartDate;
    }

    // 2. Shift matchDate to June 2, 2026, preserving original time
    if (match.matchDate) {
      const origMatchDate = new Date(match.matchDate);
      const newMatchDate = new Date(origMatchDate);
      newMatchDate.setFullYear(2026);
      newMatchDate.setMonth(5); // June is 0-indexed month 5
      newMatchDate.setDate(2);  // 2nd of the month
      updatedData.matchDate = newMatchDate;
    }

    // Perform database update
    await prisma.matches.update({
      where: { id: match.id },
      data: updatedData
    });

    count++;
    if (count % 100 === 0) {
      console.log(`Shifted dates for ${count} matches...`);
    }
  }

  console.log(`\nDate shift completed successfully!`);
  console.log(`Total matches updated: ${count}`);

  // Query a few samples to verify
  console.log('\nVerifying date adjustments (random sample of 3):');
  const samples = await prisma.matches.findMany({
    take: 3
  });
  samples.forEach(s => {
    console.log(`ID: ${s.id} | New StartDate: ${s.startDate} | New MatchDate: ${s.matchDate}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
