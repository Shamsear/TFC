/**
 * Diagnose why news wasn't generated for a specific match
 * Run: npx tsx scripts/diagnose-match-news.ts TFCMA-2664
 */

import { prisma } from '../lib/prisma';

async function diagnoseMatchNews(matchId: string) {
  console.log(`🔍 Diagnosing match news for: ${matchId}\n`);

  // 1. Check if match exists and its details
  const match = await prisma.matches.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: {
        include: {
          team: true
        }
      },
      awayTeam: {
        include: {
          team: true
        }
      },
      tournament: {
        include: {
          season: true
        }
      }
    }
  });

  if (!match) {
    console.error(`❌ Match ${matchId} not found!`);
    return;
  }

  console.log('📊 Match Details:');
  console.log(`   ${match.homeTeam.team.name} ${match.homeScore} - ${match.awayScore} ${match.awayTeam.team.name}`);
  console.log(`   Status: ${match.status}`);
  console.log(`   Round: ${match.round}`);
  console.log(`   Tournament: ${match.tournament.name}`);
  console.log(`   Season: ${match.tournament.season.name}`);
  console.log(`   Updated: ${match.updatedAt}`);
  console.log();

  // 2. Check for related news
  const news = await prisma.news.findMany({
    where: {
      OR: [
        { metadata: { path: ['home_team'], equals: match.homeTeam.team.name } },
        { metadata: { path: ['away_team'], equals: match.awayTeam.team.name } },
      ],
      created_at: {
        gte: new Date(match.updatedAt.getTime() - 60000), // Within 1 minute before
        lte: new Date(match.updatedAt.getTime() + 300000) // Within 5 minutes after
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  console.log(`📰 News articles found (within ±5min): ${news.length}`);
  if (news.length > 0) {
    news.forEach(item => {
      const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      console.log(`   ✅ ${item.id}: ${item.title_en}`);
      console.log(`      Type: ${item.event_type}`);
      console.log(`      Match: ${metadata.home_team} vs ${metadata.away_team}`);
      console.log(`      Created: ${item.created_at}`);
      console.log(`      Image: ${item.image_url || 'No image'}`);
      console.log();
    });
  } else {
    console.log(`   ❌ No news found for this match!`);
    console.log();
  }

  // 3. Check if there's news for this match at all (regardless of time)
  const anyNews = await prisma.news.findMany({
    where: {
      OR: [
        {
          AND: [
            { metadata: { path: ['home_team'], equals: match.homeTeam.team.name } },
            { metadata: { path: ['away_team'], equals: match.awayTeam.team.name } },
          ]
        },
        {
          AND: [
            { metadata: { path: ['home_team'], equals: match.awayTeam.team.name } },
            { metadata: { path: ['away_team'], equals: match.homeTeam.team.name } },
          ]
        }
      ]
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 5
  });

  if (anyNews.length > 0) {
    console.log(`📰 Historical news for these teams: ${anyNews.length} found`);
    anyNews.forEach(item => {
      const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      console.log(`   ${item.id}: ${item.title_en}`);
      console.log(`      Created: ${item.created_at}`);
      console.log();
    });
  }

  // 4. Check recent news generation activity
  console.log('📰 Recent news activity (last 10):');
  const recentNews = await prisma.news.findMany({
    orderBy: {
      created_at: 'desc'
    },
    take: 10,
    select: {
      id: true,
      title_en: true,
      event_type: true,
      created_at: true,
      image_url: true
    }
  });

  recentNews.forEach(item => {
    console.log(`   ${item.created_at.toISOString()}: ${item.event_type} - ${item.title_en.substring(0, 60)}...`);
  });
  console.log();

  // 5. Check completed matches in same round
  const roundMatches = await prisma.matches.findMany({
    where: {
      tournamentId: match.tournamentId,
      round: match.round,
      status: 'COMPLETED'
    },
    include: {
      homeTeam: {
        include: { team: true }
      },
      awayTeam: {
        include: { team: true }
      }
    },
    orderBy: {
      updatedAt: 'asc'
    }
  });

  console.log(`🏟️  Completed matches in ${match.round}:`);
  roundMatches.forEach((m, idx) => {
    const isTarget = m.id === matchId;
    console.log(`   ${isTarget ? '→' : ' '} ${idx + 1}. ${m.homeTeam.team.name} ${m.homeScore}-${m.awayScore} ${m.awayTeam.team.name} (${m.updatedAt.toISOString()})`);
  });
  console.log();

  // 6. Recommendations
  console.log('💡 Recommendations:');
  if (match.status !== 'COMPLETED') {
    console.log('   ⚠️  Match is not COMPLETED - news is only generated for completed matches');
  }
  if (match.homeScore === null || match.awayScore === null) {
    console.log('   ⚠️  Match has no scores - news requires scores to be set');
  }
  if (news.length === 0) {
    console.log('   ❌ News was NOT generated for this match');
    console.log('   Possible causes:');
    console.log('      1. News generation failed silently (check Vercel logs)');
    console.log('      2. Gemini API error (rate limit, timeout, etc.)');
    console.log('      3. Image generation failed (but news should still be created)');
    console.log('      4. Match was updated before news system was active');
    console.log();
    console.log('   To manually generate news:');
    console.log(`      1. Mark match as SCHEDULED in admin panel`);
    console.log(`      2. Update scores and mark as COMPLETED again`);
    console.log(`      OR use a script to trigger news for this match`);
  }
}

const matchId = process.argv[2];
if (!matchId) {
  console.error('Usage: npx tsx scripts/diagnose-match-news.ts <MATCH_ID>');
  console.error('Example: npx tsx scripts/diagnose-match-news.ts TFCMA-2664');
  process.exit(1);
}

diagnoseMatchNews(matchId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
