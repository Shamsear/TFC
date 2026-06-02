/**
 * Regenerate News for Matchday 1
 * 
 * This script:
 * 1. Deletes all existing news
 * 2. Finds all matchday 1/round 1 matches
 * 3. Generates match preview news for each match
 * 4. Generates match completion news for completed matches
 */

import { PrismaClient } from '@prisma/client';
import { triggerNews } from '../lib/news/trigger';
import { getTournamentContext, generateContextNarrative } from '../lib/news/tournament-context';

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

  console.log('📰 Step 3: Generating match preview news...\n');
  
  let previewCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    console.log(`   Tournament: ${tournament.name}`);
    
    for (const match of tournamentMatches) {
      try {
        // Get tournament context for both teams
        const [homeContext, awayContext] = await Promise.all([
          getTournamentContext(tournamentId, match.homeTeam.teamId),
          getTournamentContext(tournamentId, match.awayTeam.teamId)
        ]);

        // Generate narrative context
        const homeNarrative = homeContext ? generateContextNarrative(homeContext) : '';
        const awayNarrative = awayContext ? generateContextNarrative(awayContext) : '';

        // Build enriched context string for match preview
        let contextString = `Match Preview Context:\n\n`;
        if (homeContext) {
          contextString += `${match.homeTeam.team.name}: ${homeNarrative}\n\n`;
        }
        if (awayContext) {
          contextString += `${match.awayTeam.team.name}: ${awayNarrative}\n\n`;
        }

        // Add stakes analysis
        if (homeContext && awayContext) {
          const positionDiff = Math.abs(homeContext.standing.position - awayContext.standing.position);
          const pointsDiff = Math.abs(homeContext.standing.points - awayContext.standing.points);
          
          contextString += `Stakes: `;
          if (positionDiff <= 2 && pointsDiff <= 3) {
            contextString += `Tight race! These teams are separated by just ${pointsDiff} point${pointsDiff !== 1 ? 's' : ''} in the table. `;
          }
          
          if (homeContext.context.isInPlayoffs && !awayContext.context.isInPlayoffs) {
            contextString += `${match.homeTeam.team.name} defending playoff spot against challengers. `;
          } else if (!homeContext.context.isInPlayoffs && awayContext.context.isInPlayoffs) {
            contextString += `${match.awayTeam.team.name} defending playoff spot against challengers. `;
          } else if (homeContext.context.isInPlayoffs && awayContext.context.isInPlayoffs) {
            contextString += `Crucial playoff battle between two top teams. `;
          } else {
            contextString += `Both teams pushing for playoff positions. `;
          }

          // Form comparison
          const homeFormScore = (homeContext.form.last5.wins * 3) + homeContext.form.last5.draws;
          const awayFormScore = (awayContext.form.last5.wins * 3) + awayContext.form.last5.draws;
          
          if (homeFormScore > awayFormScore + 3) {
            contextString += `${match.homeTeam.team.name} in better form recently.`;
          } else if (awayFormScore > homeFormScore + 3) {
            contextString += `${match.awayTeam.team.name} in better form recently.`;
          } else {
            contextString += `Both teams evenly matched on recent form.`;
          }
        }

        const formattedDate = match.matchDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });

        // Trigger match preview news
        await triggerNews('match_started', {
          season_id: tournament.seasonId,
          season_name: tournament.season.name,
          metadata: {
            tournament_name: tournament.name,
            round: match.round,
            home_team: match.homeTeam.team.name,
            away_team: match.awayTeam.team.name,
            deadline: formattedDate,
            home_position: homeContext?.standing.position,
            home_points: homeContext?.standing.points,
            home_form: homeContext?.form.recent,
            away_position: awayContext?.standing.position,
            away_points: awayContext?.standing.points,
            away_form: awayContext?.form.recent,
            home_in_playoffs: homeContext?.context.isInPlayoffs,
            away_in_playoffs: awayContext?.context.isInPlayoffs
          },
          context: contextString
        });

        previewCount++;
        console.log(`      ✅ Preview: ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}`);
      } catch (error) {
        console.error(`      ❌ Failed preview for ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}:`, error);
      }
    }
    console.log('');
  }

  console.log(`   📊 Generated ${previewCount} match preview articles\n`);

  console.log('📰 Step 4: Generating match completion news...\n');
  
  let completionCount = 0;
  for (const [tournamentId, { tournament, matches: tournamentMatches }] of Object.entries(matchesByTournament)) {
    const completedMatches = tournamentMatches.filter(m => m.status === 'COMPLETED');
    
    if (completedMatches.length === 0) {
      console.log(`   Tournament: ${tournament.name} - No completed matches`);
      continue;
    }

    console.log(`   Tournament: ${tournament.name} - ${completedMatches.length} completed`);
    
    for (const match of completedMatches) {
      if (match.homeScore === null || match.awayScore === null) {
        console.log(`      ⚠️  Skipping ${match.homeTeam.team.name} vs ${match.awayTeam.team.name} - No scores`);
        continue;
      }

      try {
        // Get tournament context for both teams
        const [homeContext, awayContext] = await Promise.all([
          getTournamentContext(tournamentId, match.homeTeam.teamId, match.id),
          getTournamentContext(tournamentId, match.awayTeam.teamId, match.id)
        ]);

        // Generate narrative context
        const homeNarrative = homeContext ? generateContextNarrative(homeContext) : '';
        const awayNarrative = awayContext ? generateContextNarrative(awayContext) : '';

        // Build enriched context string
        let contextString = `Tournament Context:\n\n`;
        if (homeContext) {
          contextString += `${match.homeTeam.team.name}: ${homeNarrative}\n\n`;
        }
        if (awayContext) {
          contextString += `${match.awayTeam.team.name}: ${awayNarrative}\n\n`;
        }

        // Determine winner and impact
        const goalDiff = Math.abs(match.homeScore - match.awayScore);
        const winner = match.homeScore > match.awayScore ? match.homeTeam.team.name : 
                       match.awayScore > match.homeScore ? match.awayTeam.team.name : null;
        const winnerTeamId = match.homeScore > match.awayScore ? match.homeTeam.teamId : 
                             match.awayScore > match.homeScore ? match.awayTeam.teamId : null;

        // Add impact analysis
        if (winner && winnerTeamId) {
          const winnerContext = winnerTeamId === match.homeTeam.teamId ? homeContext : awayContext;
          if (winnerContext) {
            contextString += `Impact: This victory `;
            if (winnerContext.context.isLeader) {
              contextString += `strengthens ${winner}'s position at the top of the table`;
            } else if (winnerContext.context.isInPlayoffs) {
              contextString += `helps ${winner} secure their playoff position`;
            } else {
              contextString += `brings ${winner} closer to the playoff spots (now ${winnerContext.context.pointsFromPlayoffs} points away)`;
            }
            contextString += `.`;
          }
        }

        // Determine specific event type
        let eventType: any = 'match_completed';
        if (goalDiff >= 5) {
          eventType = 'thrashing';
        } else if (goalDiff === 1) {
          eventType = 'close_match';
        } else if (match.homeScore === 0 && match.awayScore === 0) {
          eventType = 'boring_draw';
        } else if ((match.homeScore + match.awayScore) >= 6) {
          eventType = 'high_scoring';
        }
        
        // Check for penalty shootout
        if (match.homePenalty !== null && match.awayPenalty !== null) {
          eventType = 'penalty_shootout';
        }

        // Trigger match completion news
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
            home_position: homeContext?.standing.position,
            home_points: homeContext?.standing.points,
            home_form: homeContext?.form.recent,
            away_position: awayContext?.standing.position,
            away_points: awayContext?.standing.points,
            away_form: awayContext?.form.recent
          },
          context: contextString
        });

        completionCount++;
        console.log(`      ✅ Result: ${match.homeTeam.team.name} ${match.homeScore}-${match.awayScore} ${match.awayTeam.team.name}`);
      } catch (error) {
        console.error(`      ❌ Failed result for ${match.homeTeam.team.name} vs ${match.awayTeam.team.name}:`, error);
      }
    }
    console.log('');
  }

  console.log(`   📊 Generated ${completionCount} match result articles\n`);

  console.log('✅ COMPLETE!');
  console.log(`   Total articles generated: ${previewCount + completionCount}`);
  console.log(`   - ${previewCount} match previews`);
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
