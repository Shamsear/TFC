/**
 * Manually generate news for a specific match
 * Run: npx tsx scripts/generate-match-news.ts TFCMA-2664
 */

import { prisma } from '../lib/prisma';
import { triggerNews } from '../lib/news/trigger';
import { getTournamentContext, generateContextNarrative } from '../lib/news/tournament-context';
import { detectMatchScenarios } from '../lib/news/scenario-detector';
import { getCleanManagerName } from '../lib/news/utils';

async function generateMatchNews(matchId: string) {
  console.log(`📰 Generating news for match: ${matchId}\n`);

  // Get match details
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
  console.log();

  // Validate
  if (match.status !== 'COMPLETED') {
    console.error(`❌ Match is not COMPLETED (status: ${match.status})`);
    console.log('   Change status to COMPLETED first.');
    return;
  }

  if (match.homeScore === null || match.awayScore === null) {
    console.error(`❌ Match has no scores!`);
    console.log('   Set match scores first.');
    return;
  }

  // Calculate match statistics
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const goalDiff = Math.abs(homeScore - awayScore);
  const winner = homeScore > awayScore ? match.homeTeam.team.name : 
                 awayScore > homeScore ? match.awayTeam.team.name : null;
  const winnerTeamId = homeScore > awayScore ? match.homeTeam.teamId : 
                       awayScore > homeScore ? match.awayTeam.teamId : null;

  // Check if this was the first completed match in the round
  const completedMatchesInRound = await prisma.matches.findMany({
    where: {
      tournamentId: match.tournamentId,
      round: match.round,
      status: 'COMPLETED'
    },
    orderBy: {
      updatedAt: 'asc'
    },
    select: {
      id: true,
      updatedAt: true
    }
  });

  const isFirstMatch = completedMatchesInRound.length > 0 && completedMatchesInRound[0].id === matchId;

  // Detect the best scenario for this match using advanced scenario detection
  console.log('🔍 Detecting match scenario...');
  const roundNumber = match.round ? parseInt(match.round.match(/\d+/)?.[0] || '1', 10) : 1;
  const scenario = await detectMatchScenarios(
    matchId,
    match.tournamentId,
    match.homeTeam.teamId,
    match.awayTeam.teamId,
    homeScore,
    awayScore,
    roundNumber,
    isFirstMatch,
    match.homePenalty,
    match.awayPenalty
  );

  const eventType = (scenario?.eventType || 'match_completed') as any;
  const scenarioMetadata = scenario?.metadata || {};

  console.log(`   Event Type: ${eventType}`);
  console.log(`   Priority: ${scenario?.priority || 0}`);
  if (Object.keys(scenarioMetadata).length > 0) {
    console.log(`   Scenario Data:`, scenarioMetadata);
  }
  console.log();

  // Get tournament context
  console.log('📊 Fetching tournament context...');
  const [homeContext, awayContext] = await Promise.all([
    getTournamentContext(match.tournamentId, match.homeTeam.teamId, matchId),
    getTournamentContext(match.tournamentId, match.awayTeam.teamId, matchId)
  ]);

  const homeNarrative = homeContext ? generateContextNarrative(homeContext) : '';
  const awayNarrative = awayContext ? generateContextNarrative(awayContext) : '';

  // Build context string
  let contextString = `Tournament Context:\n\n`;
  if (homeContext) {
    contextString += `${match.homeTeam.team.name}: ${homeNarrative}\n\n`;
  }
  if (awayContext) {
    contextString += `${match.awayTeam.team.name}: ${awayNarrative}\n\n`;
  }

  // Add impact analysis
  if (winner && winnerTeamId) {
    const winnerContext = winnerTeamId === match.homeTeam.teamId ? homeContext : awayContext;
    if (winnerContext && winnerContext.context) {
      contextString += `Impact: This victory `;
      if (winnerContext.context.isLeader) {
        contextString += `strengthens ${winner}'s position at the top of the table`;
      } else if (winnerContext.context.hasKnockoutStage && winnerContext.context.isInPlayoffs) {
        // Only mention playoffs if tournament has knockout stage
        contextString += `helps ${winner} secure their playoff position`;
      } else if (winnerContext.context.hasKnockoutStage && !winnerContext.context.isInPlayoffs) {
        // Only mention playoff chase if tournament has knockout stage
        contextString += `brings ${winner} closer to the playoff spots (now ${winnerContext.context.pointsFromPlayoffs} points away)`;
      } else {
        // Pure league - focus on position and points
        contextString += `improves ${winner}'s league position and strengthens their points tally`;
      }
      contextString += `.`;
    }
  }

  console.log('Context:', contextString.substring(0, 200) + '...\n');

  // Generate news
  console.log('🤖 Generating AI news with Gemini...');
  try {
    await triggerNews(eventType, {
      season_id: match.tournament.seasonId,
      metadata: {
        home_team: match.homeTeam.team.name,
        away_team: match.awayTeam.team.name,
        home_manager: getCleanManagerName(match.homeTeam.managerName),
        away_manager: getCleanManagerName(match.awayTeam.managerName),
        home_score: homeScore,
        away_score: awayScore,
        winner,
        goal_diff: goalDiff,
        tournament_name: match.tournament.name,
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
        away_form: awayContext?.form.recent,
        // Scenario-specific metadata
        ...scenarioMetadata
      },
      context: contextString
    });

    console.log('✅ News generated successfully!');
    console.log('\nCheck the news page or database to see the article.');
  } catch (error) {
    console.error('❌ Failed to generate news:', error);
  }
}

const matchId = process.argv[2];
if (!matchId) {
  console.error('Usage: npx tsx scripts/generate-match-news.ts <MATCH_ID>');
  console.error('Example: npx tsx scripts/generate-match-news.ts TFCMA-2664');
  process.exit(1);
}

generateMatchNews(matchId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
