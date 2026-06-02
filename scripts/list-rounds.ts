/**
 * List all unique round names in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Fetching all unique round names...\n');
  
  const matches = await prisma.matches.findMany({
    select: {
      round: true,
      status: true,
      tournament: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      round: 'asc'
    }
  });

  // Group by round
  const roundStats = matches.reduce((acc, match) => {
    if (!match.round) return acc;
    
    if (!acc[match.round]) {
      acc[match.round] = {
        total: 0,
        completed: 0,
        tournaments: new Set()
      };
    }
    
    acc[match.round].total++;
    if (match.status === 'COMPLETED') {
      acc[match.round].completed++;
    }
    acc[match.round].tournaments.add(match.tournament.name);
    
    return acc;
  }, {} as Record<string, { total: number; completed: number; tournaments: Set<string> }>);

  console.log('Available rounds:\n');
  console.log('─'.repeat(80));
  
  for (const [round, stats] of Object.entries(roundStats)) {
    const tournaments = Array.from(stats.tournaments).join(', ');
    console.log(`📋 "${round}"`);
    console.log(`   Matches: ${stats.completed}/${stats.total} completed`);
    console.log(`   Tournaments: ${tournaments}`);
    console.log('');
  }
  
  console.log('─'.repeat(80));
  console.log('\n💡 To generate news for a round, use:');
  console.log('   npm run news:matchday -- "Round 1"');
  console.log('   npm run news:matchday -- "Matchday 2"');
  console.log('   etc.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
