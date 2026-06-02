/**
 * Generate News for Any Matchday
 * 
 * Usage: tsx scripts/generate-matchday-news.ts <round_name>
 * Examples:
 *   tsx scripts/generate-matchday-news.ts "Matchday 2"
 *   tsx scripts/generate-matchday-news.ts "Round 2"
 * 
 * Generates:
 * 1. Matchday start overview (if matches exist)
 * 2. Match result news for completed matches
 * 3. Matchday completion overview (if ALL matches complete)
 */

import { PrismaClient } from '@prisma/client';
import { triggerNews } from '../lib/news/trigger';

const prisma = new PrismaClient();

async function main() {
  const roundName = process.argv[2];
  
  if (!roundName) {
    console.error('❌ Please provide a round name');
    console.error('Usage: npm run news:matchday -- "Matchday 2"');
    process.exit(1);
  }

  console.log(`🔍 Finding matches for: ${roundName}\n`);
  
  // Find all matches for this round
  const matches = await prisma.matches.findMany({
    where: {
      round: roundName
    },
    include: {
      homeTeam: {
        include: { team: true }
      },
      awayTeam: {
        include: { team: true }
      },
      tournament: {
        include: {
          season: true
        }
      }
    },
    orderBy: {
      matchDate: 'asc'
    }
  });

  if (matches.length === 0) {
    console.log(`   ⚠️  No matches found for "${roundName}"`);
    return;
  }

  const completedMatches = matches.filter(m => m.status === 'COMPLETED');
  console.log(`   ✅ Found ${matches.length} total matches (${completedMatches.length} completed)\n`);

  // Group matches by tournament
  const matchesByTournament = matches.reduce((acc, match) => {
    const key = match.tournamentId;
    if (!acc[key]) {
      acc[key] = {
        tournament: match.tournament,
        allMatches: [],
        completedMatches: []
      };
    }
    acc[key].allMatches.push(match);
    if (match.status === 'COMPLETED') {
      acc[key].completedMatches.push(match);
    }
    return acc;
  }, {} as Record<string, { tournament: any, allMatches: any[], completedMatches: any[] }>);

  // STEP 1: Generate matchday start overview
  console.log('📰 Step 1: Generating matchday start overview...\n');
  
  let startCount = 0;
  for (const [tournamentId, { tournament, allMatches }] of Object.entries(matchesByTournament)) {
    console.log(`   Tournament: ${tournament.name}`);
    
    try {
      const matchList = allMatches.map(m => 
        `${m.homeTeam.team.name} vs ${m.awayTeam.team.name}`
      ).join(', ');

      const formattedDate = allMatches[0].matchDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      await triggerNews('matchday_started', {
        season_id: tournament.seasonId,
        season_name: tournament.season.name,
        metadata: {
          tournament_name: tournament.name,
          round: roundName,
          match_count: allMatches.length,
          deadline: formattedDate,
          matches: matchList
        }
      });

      startCount++;
      console.log(`      ✅ Start Overview: ${roundName} - ${allMatches.length} matches`);
    } catch (error) {
      console.error(`      ❌ Failed to generate start overview:`, error);
    }
    console.log('');
  }

  console.log(`   📊 Generated ${startCount} matchday start articles\n`);

  // STEP 2: Generate individual match result news
  console.log('📰 Step 2: Generating match result news...\n');
  
  let resultCount = 0;
  for (const [tournamentId, { tournament, completedMatches }] of Object.entries(matchesByTournament)) {
    if (completedMatches.length === 0) {
      console.log(`   Tournament: ${tournament.name} - No completed matches yet\n`);
      continue;
    }

    console.log(`   Tournament: ${tournament.name} - ${completedMatches.length} completed`);
    
    // Sort by updatedAt to find which match was completed first
    const sortedByCompletion = [...completedMatches].sort((a, b) => 
      a.updatedAt.getTime() - b.updatedAt.getTime()
    );

    for (let i = 0; i < sortedByCompletion.length; i++) {
      const match = sortedByCompletion[i];
      const isFirstMatch = i === 0;
      const matchNumber = i + 1;

      if (match.homeScore === null || match.awayScore === null) {
        console.log(`      ⚠️  Skipping ${match.homeTeam.team.name} vs ${match.awayTeam.team.name} - No scores`);
        continue;
      }

      try {
        const goalDiff = Math.abs(match.homeScore - match.awayScore);
        const winner = match.homeScore > match.awayScore ? match.homeTeam.team.name : 
                       match.awayScore > match.homeScore ? match.awayTeam.team.name : null;

        // Determine event type
        let eventType: any = 'match_completed';
        
        if (isFirstMatch) {
          eventType = 'matchday_opener';
        } else if (goalDiff >= 5) {
          eventType = 'thrashing';
        } else if (goalDiff === 1) {
          eventType = 'close_match';
        } else if (match.homeScore === 0 && match.awayScore === 0) {
          eventType = 'boring_draw';
        } else if ((match.homeScore + match.awayScore) >= 6) {
          eventType = 'high_scoring';
        }
        
        if (match.homePenalty !== null && match.awayPenalty !== null && !isFirstMatch) {
          eventType = 'penalty_shootout';
        }

        await triggerNews(eventType, {
          season_id: tournament.seasonId,
          metadata: {
            home_team: match.homeTeam.team.name,
            away_team: match.awayTeam.team.name,
            home_score: match.homeScore,
            away_score: match.awayScore,
            winner,
            goal_diff: goalDiff,
            tournament_name: tournament.name,
            round: roundName,
            venue: match.venue,
            has_penalties: match.homePenalty !== null && match.awayPenalty !== null,
            home_penalty: match.homePenalty,
            away_penalty: match.awayPenalty,
            is_first_match: isFirstMatch,
            match_order: matchNumber,
            total_matches: completedMatches.length
          }
        });

        resultCount++;
        const label = isFirstMatch ? '🎬 OPENER' : `#${matchNumber}`;
        console.log(`      ✅ ${label}: ${match.homeTeam.team.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.team.name}`);
      } catch (error) {
        console.error(`      ❌ Failed result for ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}:`, error);
      }
    }
    console.log('');
  }

  console.log(`   📊 Generated ${resultCount} match result articles\n`);

  // STEP 3: Check if matchday is complete and generate completion overview
  console.log('📰 Step 3: Checking for matchday completion...\n');
  
  let completionCount = 0;
  for (const [tournamentId, { tournament, allMatches, completedMatches }] of Object.entries(matchesByTournament)) {
    const isComplete = allMatches.length === completedMatches.length && completedMatches.length > 0;
    
    if (!isComplete) {
      console.log(`   Tournament: ${tournament.name} - Not complete yet (${completedMatches.length}/${allMatches.length})\n`);
      continue;
    }

    console.log(`   Tournament: ${tournament.name} - COMPLETE! Generating overview...`);
    
    try {
      // Calculate statistics
      const results = completedMatches.map(m => ({
        home: m.homeTeam.team.name,
        away: m.awayTeam.team.name,
        homeScore: m.homeScore || 0,
        awayScore: m.awayScore || 0,
        totalGoals: (m.homeScore || 0) + (m.awayScore || 0),
        winner: (m.homeScore || 0) > (m.awayScore || 0) ? m.homeTeam.team.name :
                (m.awayScore || 0) > (m.homeScore || 0) ? m.awayTeam.team.name : null,
        goalDiff: Math.abs((m.homeScore || 0) - (m.awayScore || 0))
      }));

      const totalGoals = results.reduce((sum, r) => sum + r.totalGoals, 0);
      const biggestWin = results.reduce((max, r) => r.goalDiff > max.goalDiff ? r : max, results[0]);
      const highestScoring = results.reduce((max, r) => r.totalGoals > max.totalGoals ? r : max, results[0]);
      const winners = results.filter(r => r.winner).map(r => r.winner);
      const draws = results.filter(r => !r.winner).length;
      
      const winCounts = winners.reduce((acc, team) => {
        acc[team!] = (acc[team!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const bestTeam = Object.entries(winCounts).reduce((max, [team, wins]) => 
        wins > max.wins ? { team, wins } : max,
        { team: '', wins: 0 }
      );

      await triggerNews('matchday_completed', {
        season_id: tournament.seasonId,
        season_name: tournament.season.name,
        metadata: {
          tournament_name: tournament.name,
          round: roundName,
          total_matches: completedMatches.length,
          total_goals: totalGoals,
          total_draws: draws,
          biggest_win_team: biggestWin.winner,
          biggest_win_margin: biggestWin.goalDiff,
          biggest_win_score: `${biggestWin.homeScore}-${biggestWin.awayScore}`,
          highest_scoring_match: `${highestScoring.home} ${highestScoring.homeScore}-${highestScoring.awayScore} ${highestScoring.away}`,
          highest_scoring_goals: highestScoring.totalGoals,
          best_team: bestTeam.wins > 0 ? bestTeam.team : 'Various teams',
          best_team_wins: bestTeam.wins,
          all_results: results.map(r => `${r.home} ${r.homeScore}-${r.awayScore} ${r.away}`).join('; ')
        }
      });

      completionCount++;
      console.log(`      ✅ Completion Overview: ${roundName}`);
      console.log(`         - ${completedMatches.length} matches, ${totalGoals} goals`);
      console.log(`         - Best team: ${bestTeam.team} (${bestTeam.wins} wins)`);
    } catch (error) {
      console.error(`      ❌ Failed to generate completion overview:`, error);
    }
    console.log('');
  }

  if (completionCount > 0) {
    console.log(`   📊 Generated ${completionCount} matchday completion articles\n`);
  }

  console.log('✅ COMPLETE!');
  console.log(`   Summary for "${roundName}":`);
  console.log(`   - ${startCount} matchday start articles`);
  console.log(`   - ${resultCount} match result articles`);
  console.log(`   - ${completionCount} matchday completion articles`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
