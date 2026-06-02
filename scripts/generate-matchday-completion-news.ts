/**
 * Generate Matchday Completion News ONLY
 * 
 * This script generates a completion overview for matchday 1 with:
 * - All match results summary
 * - Best performing team
 * - Highest scoring match
 * - Biggest win
 * - Total goals
 */

import { PrismaClient } from '@prisma/client';
import { triggerNews } from '../lib/news/trigger';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding matchday 1 matches...\n');
  
  // Find all matches in round 1/matchday 1
  const matches = await prisma.matches.findMany({
    where: {
      OR: [
        { round: 'Round 1' },
        { round: 'Matchday 1' },
        { round: 'MD 1' },
        { round: 'R1' }
      ],
      status: 'COMPLETED'
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
    console.log('   ⚠️  No completed matchday 1 matches found');
    return;
  }

  console.log(`   ✅ Found ${matches.length} completed matchday 1 matches\n`);

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

  console.log('📰 Generating matchday completion overview...\n');
  
  let completionCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    console.log(`   Tournament: ${tournament.name}`);
    
    try {
      // Calculate match statistics
      const results = tournamentMatches.map(m => ({
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
      const draws = results.filter(r => !r.winner).length;
      
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
          round: tournamentMatches[0].round,
          total_matches: tournamentMatches.length,
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
      console.log(`      ✅ Overview: ${tournamentMatches[0].round}`);
      console.log(`         - ${tournamentMatches.length} matches, ${totalGoals} goals`);
      console.log(`         - Best team: ${bestTeam.team} (${bestTeam.wins} wins)`);
      console.log(`         - Biggest win: ${biggestWin.winner} (${biggestWin.goalDiff}-goal margin)`);
      console.log(`         - Highest scoring: ${highestScoring.totalGoals} goals`);
    } catch (error) {
      console.error(`      ❌ Failed to generate overview:`, error);
    }
    console.log('');
  }

  console.log(`✅ COMPLETE! Generated ${completionCount} matchday completion articles`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
