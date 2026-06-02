/**
 * Regenerate News for Matchday 1 - SIMPLE VERSION
 * 
 * This script:
 * 1. Deletes all existing news
 * 2. Finds all matchday 1/round 1 matches
 * 3. Generates match preview news (WITHOUT tournament context to avoid errors)
 * 4. Generates match completion news for completed matches
 */

import { PrismaClient } from '@prisma/client';
import { triggerNews } from '../lib/news/trigger';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Step 1: Deleting all existing news...');
  
  const deleteResult = await prisma.news.deleteMany({});
  console.log(`   ✅ Deleted ${deleteResult.count} news articles\n`);

  console.log('🔍 Step 2: Finding matchday 1 matches...');
  
  // Find all matches in round 1/matchday 1
  const matches = await prisma.matches.findMany({
    where: {
      OR: [
        { round: 'Round 1' },
        { round: 'Matchday 1' },
        { round: 'MD 1' },
        { round: 'R1' }
      ]
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
    console.log('   ⚠️  No matchday 1 matches found');
    return;
  }

  console.log(`   ✅ Found ${matches.length} matchday 1 matches\n`);

  // Group matches by tournament
  const matchesByTournament = matches.reduce((acc, match) => {
    const key = match.tournamentId;
    if (!acc[key]) {
      acc[key] = {
        tournament: match.tournament,
        matches: []
      };
    }
    acc[key].matches.push(match);
    return acc;
  }, {} as Record<string, { tournament: any, matches: any[] }>);

  console.log('📰 Step 3: Generating matchday overview news...\n');
  
  let overviewCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    console.log(`   Tournament: ${tournament.name}`);
    
    try {
      // Create a single overview article for the entire matchday
      const matchList = tournamentMatches.map(m => 
        `${m.homeTeam.team.name} vs ${m.awayTeam.team.name}`
      ).join(', ');

      const formattedDate = tournamentMatches[0].matchDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      // Trigger ONE matchday overview news
      await triggerNews('matchday_started', {
        season_id: tournament.seasonId,
        season_name: tournament.season.name,
        metadata: {
          tournament_name: tournament.name,
          round: tournamentMatches[0].round,
          match_count: tournamentMatches.length,
          deadline: formattedDate,
          matches: matchList
        }
      });

      overviewCount++;
      console.log(`      ✅ Matchday Overview: ${tournamentMatches[0].round} - ${tournamentMatches.length} matches`);
    } catch (error) {
      console.error(`      ❌ Failed to generate matchday overview:`, error);
    }
    console.log('');
  }

  console.log(`   📊 Generated ${overviewCount} matchday overview articles\n`);

  console.log('📰 Step 4: Generating match completion news (simple - no context)...\n');
  
  let completionCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    const completedMatches = tournamentMatches.filter(m => m.status === 'COMPLETED');
    
    if (completedMatches.length === 0) {
      console.log(`   Tournament: ${tournament.name} - No completed matches`);
      continue;
    }

    console.log(`   Tournament: ${tournament.name} - ${completedMatches.length} completed`);
    
    // Sort by updatedAt to find which match was completed first, second, etc.
    const sortedByCompletion = [...completedMatches].sort((a, b) => 
      a.updatedAt.getTime() - b.updatedAt.getTime()
    );

    for (let i = 0; i < sortedByCompletion.length; i++) {
      const match = sortedByCompletion[i];
      const isFirstMatch = i === 0;
      const isLastMatch = i === sortedByCompletion.length - 1;
      const matchNumber = i + 1;

      if (match.homeScore === null || match.awayScore === null) {
        console.log(`      ⚠️  Skipping ${match.homeTeam.team.name} vs ${match.awayTeam.team.name} - No scores`);
        continue;
      }

      try {
        // Determine winner and impact
        const goalDiff = Math.abs(match.homeScore - match.awayScore);
        const winner = match.homeScore > match.awayScore ? match.homeTeam.team.name : 
                       match.awayScore > match.homeScore ? match.awayTeam.team.name : null;

        // Determine specific event type
        let eventType: any = 'match_completed';
        
        // Special event for first completed match
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
        
        // Check for penalty shootout (overrides other types except matchday_opener)
        if (match.homePenalty !== null && match.awayPenalty !== null && !isFirstMatch) {
          eventType = 'penalty_shootout';
        }

        // Trigger match completion news WITHOUT tournament context
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
            round: match.round,
            venue: match.venue,
            has_penalties: match.homePenalty !== null && match.awayPenalty !== null,
            home_penalty: match.homePenalty,
            away_penalty: match.awayPenalty,
            // Additional metadata for sequencing
            is_first_match: isFirstMatch,
            is_last_match: isLastMatch,
            match_order: matchNumber,
            total_matches: completedMatches.length
          }
        });

        completionCount++;
        const label = isFirstMatch ? '🎬 OPENER' : isLastMatch ? '🏁 LAST' : `#${matchNumber}`;
        console.log(`      ✅ ${label}: ${match.homeTeam.team.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.team.name}`);
      } catch (error) {
        console.error(`      ❌ Failed result for ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}:`, error);
      }
    }
    console.log('');
  }

  console.log(`   📊 Generated ${completionCount} match result articles\n`);

  console.log('📰 Step 5: Generating matchday completion overview...\n');
  
  let completionOverviewCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    const completedMatches = tournamentMatches.filter(m => m.status === 'COMPLETED');
    
    if (completedMatches.length === 0) {
      console.log(`   Tournament: ${tournament.name} - No completed matches`);
      continue;
    }

    console.log(`   Tournament: ${tournament.name}`);
    
    try {
      // Calculate match statistics
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

      // Find best performances
      const totalGoals = results.reduce((sum, r) => sum + r.totalGoals, 0);
      const biggestWin = results.reduce((max, r) => r.goalDiff > max.goalDiff ? r : max, results[0]);
      const highestScoring = results.reduce((max, r) => r.totalGoals > max.totalGoals ? r : max, results[0]);
      const winners = results.filter(r => r.winner).map(r => r.winner);
      
      // Count wins per team
      const winCounts = winners.reduce((acc, team) => {
        acc[team!] = (acc[team!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const bestTeam = Object.entries(winCounts).reduce((max, [team, wins]) => 
        wins > max.wins ? { team, wins } : max,
        { team: '', wins: 0 }
      );

      // Trigger matchday completion overview
      await triggerNews('matchday_completed', {
        season_id: tournament.seasonId,
        season_name: tournament.season.name,
        metadata: {
          tournament_name: tournament.name,
          round: completedMatches[0].round,
          total_matches: completedMatches.length,
          total_goals: totalGoals,
          biggest_win: `${biggestWin.winner} (${biggestWin.goalDiff}-goal margin)`,
          highest_scoring: `${highestScoring.home} ${highestScoring.homeScore}-${highestScoring.awayScore} ${highestScoring.away} (${highestScoring.totalGoals} goals)`,
          best_team: bestTeam.wins > 0 ? bestTeam.team : 'No clear standout',
          best_team_wins: bestTeam.wins,
          all_results: results.map(r => `${r.home} ${r.homeScore}-${r.awayScore} ${r.away}`).join(', ')
        }
      });

      completionOverviewCount++;
      console.log(`      ✅ Matchday Wrap-up: ${completedMatches[0].round} - ${completedMatches.length} matches, Best: ${bestTeam.team}`);
    } catch (error) {
      console.error(`      ❌ Failed to generate matchday completion overview:`, error);
    }
    console.log('');
  }

  console.log(`   📊 Generated ${completionOverviewCount} matchday completion articles\n`);

  console.log('✅ COMPLETE!');
  console.log(`   Total articles generated: ${overviewCount + completionCount}`);
  console.log(`   - ${overviewCount} matchday overviews`);
  console.log(`   - ${completionCount} match results`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
