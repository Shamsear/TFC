import { prisma } from '../lib/prisma';

async function main() {
  const events = await prisma.news.findMany({
    select: {
      id: true,
      event_type: true,
      metadata: true
    },
    take: 50,
    orderBy: { created_at: 'desc' }
  });

  const eventTypes = new Set(events.map(e => e.event_type));
  console.log("Recent Event Types:");
  console.log(Array.from(eventTypes));

  const missingLogo = events.filter(e => 
    (e.event_type.includes('match') || e.event_type === 'thrashing' || e.event_type === 'close_match' || e.event_type === 'matchday_opener') && 
    (typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata)?.home_team
  );

  console.log("\nMatches with home_team:");
  missingLogo.slice(0, 5).forEach(e => {
    const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
    console.log(`- ${e.id} [${e.event_type}]: ${meta.home_team} vs ${meta.away_team}`);
  });
}

main().finally(() => process.exit(0));
