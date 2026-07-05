import { NextRequest, NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'
import { evaluateTeamAchievements } from '@/lib/achievements-engine'
import { triggerNews } from '@/lib/news/trigger'
import { getTournamentContext, generateContextNarrative } from '@/lib/news/tournament-context'
import { detectMatchScenarios } from '@/lib/news/scenario-detector'
import { getCleanManagerName } from '@/lib/news/utils'
import { NewsEventType } from '@/lib/news/types'

// ⚡ Increase timeout for news generation (Vercel default is 10s)
export const maxDuration = 60; // 60 seconds max execution time

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string; matchId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, tournamentId, matchId } = await params
    const body = await request.json()
    const {
      matchDate,
      venue,
      round,
      status,
      homeScore,
      awayScore,
      homePenalty,
      awayPenalty,
      notes
    } = body

    // Get the match to check previous status
    const existingMatch = await prisma.matches.findUnique({
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
        group: true,
        tournament: {
          include: {
            season: true
          }
        }
      }
    })

    if (!existingMatch) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Update match
    const updatedMatch = await prisma.$transaction(async (tx) => {
      const match = await tx.matches.update({
        where: { id: matchId },
        data: {
          matchDate: new Date(matchDate),
          venue: venue || null,
          round: round || null,
          status,
          homeScore,
          awayScore,
          homePenalty,
          awayPenalty,
          notes: notes || null,
          updatedAt: new Date()
        }
      })

      // Update standings if match is completed or walkover and has scores
      const isCounted = status === 'COMPLETED' || status === 'WALKOVER'
      const wasCounted = existingMatch.status === 'COMPLETED' || existingMatch.status === 'WALKOVER'

      if (isCounted && homeScore !== null && awayScore !== null) {
        // Only update if this is a new completion, status changed, or scores changed
        const shouldUpdateStandings = 
          !wasCounted ||
          existingMatch.status !== status ||
          existingMatch.homeScore !== homeScore ||
          existingMatch.awayScore !== awayScore

        if (shouldUpdateStandings) {
          // Revert old scores if match was previously completed/walkover
          if (wasCounted && existingMatch.homeScore !== null && existingMatch.awayScore !== null) {
            await updateStandings(tx, existingMatch, true) // Revert
          }

          // Apply new scores
          await updateStandings(tx, { ...match, homeTeam: existingMatch.homeTeam, awayTeam: existingMatch.awayTeam, group: existingMatch.group }, false)
        }
      } else {
        // If it was counted previously, but now changed to uncounted (like VOID, SCHEDULED, POSTPONED, etc.)
        if (wasCounted && existingMatch.homeScore !== null && existingMatch.awayScore !== null) {
          await updateStandings(tx, existingMatch, true) // Revert
        }
      }

      return { match, shouldEvaluateAchievements: status === 'COMPLETED' && (
        !wasCounted ||
        existingMatch.status !== status ||
        existingMatch.homeScore !== homeScore ||
        existingMatch.awayScore !== awayScore
      ) && homeScore !== null && awayScore !== null }
    })

    // ⚡⚡⚡ OPTIMIZED BACKGROUND TASKS
    const startBackgroundTasks = Date.now();
    console.log('[Match Submission] Match saved. Delegating background tasks...');
    
    const isNewsWorthy = (status === 'COMPLETED' || status === 'WALKOVER' || status === 'VOID') && 
                         existingMatch.status !== status;
    
    const executeBackgroundTasks = async () => {
      try {
        console.log(`[Background] Starting async processing...`);
        
        // Group 1: Audit Log (Fast, 1 connection)
        const runAudit = async () => {
          await createAuditLog({
            userId: session.user.id,
            userEmail: session.user.email!,
            userRole: session.user.role!,
            action: 'UPDATE_MATCH',
            entityType: 'match',
            entityId: matchId,
            entityName: `${existingMatch.homeTeam.team.name} vs ${existingMatch.awayTeam.team.name}`,
            seasonId,
            details: {
              matchDate,
              venue,
              round,
              status,
              homeScore,
              awayScore,
              homePenalty,
              awayPenalty,
              previousStatus: existingMatch.status,
              previousHomeScore: existingMatch.homeScore,
              previousAwayScore: existingMatch.awayScore
            },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          }).catch(err => console.error('[Audit] Failed:', err));
        };
        
        // Group 2: Achievements (Heavy DB usage, runs teams sequentially to save connections)
        const runAchievements = async () => {
          if (!updatedMatch.shouldEvaluateAchievements) return;
          try {
            const homeResults = await evaluateTeamAchievements(existingMatch.homeTeam.teamId);
            const awayResults = await evaluateTeamAchievements(existingMatch.awayTeam.teamId);

            if (homeResults?.leveledUp) {
              await triggerNews('team_level_up', {
                season_id: seasonId,
                metadata: {
                  team_name: existingMatch.homeTeam.team.name,
                  old_level: homeResults.oldLevel,
                  new_level: homeResults.newLevel
                }
              }).catch(err => console.warn('[News AI] Failed to generate home level up news:', err));
            }

            if (awayResults?.leveledUp) {
              await triggerNews('team_level_up', {
                season_id: seasonId,
                metadata: {
                  team_name: existingMatch.awayTeam.team.name,
                  old_level: awayResults.oldLevel,
                  new_level: awayResults.newLevel
                }
              }).catch(err => console.warn('[News AI] Failed to generate away level up news:', err));
            }
          } catch (err) {
            console.error('[Achievements] Evaluation failed:', err);
          }
        };
        
        // Group 3: Notifications and Match News (Heavy CPU/HTTP usage, 1-2 DB connections)
        const runNewsAndNotifs = async () => {
          if (!isNewsWorthy) return;
          try {
            // Notifications...
            const homeManagerId = await getTeamManagerId(existingMatch.homeTeam.team.id);
            const awayManagerId = await getTeamManagerId(existingMatch.awayTeam.team.id);
            
            const matchTitle = status === 'VOID' ? '🚫 Match Voided' : 
                              status === 'WALKOVER' ? '⚠️ Match Walkover' : 
                              '🏟️ Match Result Published';
            
            let matchBody = `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}`;
            if (status === 'WALKOVER') matchBody += ' (Walkover)';
            else if (status === 'VOID') matchBody += ' (Voided)';
            else if (homePenalty !== null && awayPenalty !== null) matchBody += ` (${homePenalty}-${awayPenalty} pens)`;
            
            const notificationPromises = [];
            if (homeManagerId) notificationPromises.push(sendPushNotificationRaw(homeManagerId, { title: matchTitle, body: matchBody, url: `/team/matches/${matchId}` }, 'general').catch(() => {}));
            if (awayManagerId) notificationPromises.push(sendPushNotificationRaw(awayManagerId, { title: matchTitle, body: matchBody, url: `/team/matches/${matchId}` }, 'general').catch(() => {}));
            
            const adminTitle = status === 'VOID' ? 'Match Voided' : status === 'WALKOVER' ? 'Match Walkover' : 'Match Result Published';
            const adminBody = `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}` + (status === 'WALKOVER' ? ' (Walkover)' : status === 'VOID' ? ' (Voided)' : '');
            notificationPromises.push(notifyAllAdmins({ title: adminTitle, body: adminBody, url: `/sub-admin/${seasonId}/tournaments/${tournamentId}` }, seasonId).catch(() => {}));
            
            await Promise.all(notificationPromises);
          } catch (notifErr) {
            console.warn('[Push] Notification batch failed:', notifErr);
          }

          // News Generation...
          try {
            if (status === 'VOID') {
              await triggerNews('match_voided', {
                season_id: seasonId,
                metadata: {
                  home_team: existingMatch.homeTeam.team.name,
                  away_team: existingMatch.awayTeam.team.name,
                  home_manager: getCleanManagerName(existingMatch.homeTeam.managerName),
                  away_manager: getCleanManagerName(existingMatch.awayTeam.managerName),
                  tournament_name: existingMatch.tournament?.name || 'Tournament',
                  round: round || existingMatch.round,
                  venue: venue || existingMatch.venue,
                  reason: notes || 'Administrative decision'
                },
                context: `This match has been declared void and will not count towards tournament standings.`
              });
              return;
            }

            const goalDiff = Math.abs(homeScore - awayScore);
            const winner = homeScore > awayScore ? existingMatch.homeTeam.team.name : awayScore > homeScore ? existingMatch.awayTeam.team.name : null;
            const winnerTeamId = homeScore > awayScore ? existingMatch.homeTeam.teamId : awayScore > homeScore ? existingMatch.awayTeam.teamId : null;
            
            const completedMatchesInRound = await prisma.matches.findMany({
              where: { tournamentId, round: existingMatch.round, status: { in: ['COMPLETED', 'WALKOVER'] } },
              orderBy: { updatedAt: 'asc' }, select: { id: true, updatedAt: true }
            });
            const isFirstMatch = completedMatchesInRound.length > 0 && completedMatchesInRound[0].id === matchId;
            
            const allMatchesInRound = await prisma.matches.findMany({
              where: { tournamentId, round: existingMatch.round }, select: { id: true, status: true }
            });
            const isLastMatchToComplete = allMatchesInRound.length > 0 && allMatchesInRound.every(m => m.status === 'COMPLETED' || m.status === 'WALKOVER') && completedMatchesInRound[completedMatchesInRound.length - 1]?.id === matchId;
            
            let eventType: NewsEventType;
            let scenarioMetadata = {};
            
            if (status === 'WALKOVER') {
              eventType = 'match_walkover';
              scenarioMetadata = { is_walkover: true, walkover_winner: winner };
            } else {
              const scenario = await detectMatchScenarios(matchId, tournamentId, existingMatch.homeTeam.teamId, existingMatch.awayTeam.teamId, homeScore, awayScore, existingMatch.round ? parseInt(existingMatch.round.match(/\d+/)?.[0] || '1', 10) : 1, isFirstMatch, homePenalty, awayPenalty);
              eventType = (scenario?.eventType || 'match_completed') as NewsEventType;
              scenarioMetadata = scenario?.metadata || {};
            }

            const tournament = existingMatch.tournament;
            const homeContext = await getTournamentContext(tournamentId, existingMatch.homeTeam.teamId, matchId);
            const awayContext = await getTournamentContext(tournamentId, existingMatch.awayTeam.teamId, matchId);
            const homeNarrative = homeContext ? generateContextNarrative(homeContext) : '';
            const awayNarrative = awayContext ? generateContextNarrative(awayContext) : '';

            let contextString = `Tournament Context:\n\n`;
            if (homeContext) contextString += `${existingMatch.homeTeam.team.name}: ${homeNarrative}\n\n`;
            if (awayContext) contextString += `${existingMatch.awayTeam.team.name}: ${awayNarrative}\n\n`;

            if (winner && winnerTeamId) {
              const winnerContext = winnerTeamId === existingMatch.homeTeam.teamId ? homeContext : awayContext;
              if (winnerContext?.context) {
                contextString += `Impact: This victory `;
                if (winnerContext.context.isLeader) contextString += `strengthens ${winner}'s position at the top of the table`;
                else if (winnerContext.context.hasKnockoutStage && winnerContext.context.isInPlayoffs) contextString += `helps ${winner} secure their playoff position`;
                else if (winnerContext.context.hasKnockoutStage && !winnerContext.context.isInPlayoffs) contextString += `brings ${winner} closer to the playoff spots (now ${winnerContext.context.pointsFromPlayoffs} points away)`;
                else contextString += `improves ${winner}'s league position and strengthens their points tally`;
                contextString += `.`;
              }
            }

            await triggerNews(eventType, {
              season_id: seasonId,
              metadata: {
                match_id: matchId, home_team: existingMatch.homeTeam.team.name, away_team: existingMatch.awayTeam.team.name,
                home_manager: getCleanManagerName(existingMatch.homeTeam.managerName), away_manager: getCleanManagerName(existingMatch.awayTeam.managerName),
                home_score: homeScore, away_score: awayScore, winner, goal_diff: goalDiff,
                tournament_name: tournament?.name || 'Tournament', round: round || existingMatch.round, venue: venue || existingMatch.venue,
                has_penalties: homePenalty !== null && awayPenalty !== null, home_penalty: homePenalty, away_penalty: awayPenalty,
                home_position: homeContext?.standing.position, home_points: homeContext?.standing.points, home_form: homeContext?.form.recent,
                away_position: awayContext?.standing.position, away_points: awayContext?.standing.points, away_form: awayContext?.form.recent,
                ...scenarioMetadata
              },
              context: contextString
            });
            
            if (isLastMatchToComplete) {
              const roundMatches = await prisma.matches.findMany({
                where: { tournamentId, round: existingMatch.round, status: { in: ['COMPLETED', 'WALKOVER'] } },
                include: { homeTeam: { include: { team: true } }, awayTeam: { include: { team: true } } },
                orderBy: { matchDate: 'asc' }
              });
              
              const resultsSummary = roundMatches.map(m => `${m.homeTeam.team.name} ${m.homeScore || 0}-${m.awayScore || 0} ${m.awayTeam.team.name}`).join(', ');
              const totalGoals = roundMatches.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
              const recapContext = `Matchday ${existingMatch.round} Results:\n\n${roundMatches.length} matches completed with ${totalGoals} goals scored.\n\nResults: ${resultsSummary}\n\nThis matchday concludes ${existingMatch.round} of ${tournament?.name || 'the tournament'}.`;
              
              await triggerNews('matchday_completed', {
                season_id: seasonId, season_name: tournament?.season?.name,
                metadata: {
                  tournament_name: tournament?.name || 'Tournament', round: existingMatch.round, total_matches: roundMatches.length, total_goals: totalGoals,
                  results: roundMatches.map(m => ({ home_team: m.homeTeam.team.name, away_team: m.awayTeam.team.name, home_score: m.homeScore || 0, away_score: m.awayScore || 0 }))
                },
                context: recapContext
              });
            }
          } catch (newsErr) {
            console.warn('[News AI] Failed to generate match news:', newsErr);
          }
        };

        // Tournament Linking System check
        const runTournamentLinking = async () => {
          try {
            const { runTournamentStatusUpdate } = require('@/lib/tournament-linking')
            await runTournamentStatusUpdate(tournamentId)
          } catch (err) {
            console.error('[Linking] Background check failed:', err)
          }
        }

        // Run concurrently. 
        // This utilizes safe DB connection limits while keeping execution time fast.
        await Promise.all([
          runAudit(),
          runAchievements(),
          runNewsAndNotifs(),
          runTournamentLinking()
        ]);
        
        console.log(`[Background] ✅ All background tasks completed`);
      } catch (e) {
        console.error('[Background] Critical failure:', e);
      }
    };
    
    // In development, Next.js blocks after(), making the UI slow. setTimeout bypasses this locally.
    // In production, we rely on after() to ensure Vercel doesn't kill the lambda prematurely.
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        executeBackgroundTasks().catch(console.error);
      }, 0);
    } else {
      after(() => executeBackgroundTasks());
    }
    
    console.log(`[Match Submission] ✅ Database update complete. API response sent in ${Date.now() - startBackgroundTasks}ms.`);

    return NextResponse.json(updatedMatch)
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json(
      { error: 'Failed to update match' },
      { status: 500 }
    )
  }
}

// Helper function to update standings
async function updateStandings(tx: any, match: any, revert: boolean) {
  const homeScore = match.homeScore!
  const awayScore = match.awayScore!
  const multiplier = revert ? -1 : 1

  let homePoints = 0
  let awayPoints = 0
  let homeWon = 0
  let awayWon = 0
  let homeDrawn = 0
  let awayDrawn = 0
  let homeLost = 0
  let awayLost = 0

  // Determine result
  if (homeScore > awayScore) {
    homePoints = 3
    homeWon = 1
    awayLost = 1
  } else if (awayScore > homeScore) {
    awayPoints = 3
    awayWon = 1
    homeLost = 1
  } else {
    homePoints = 1
    awayPoints = 1
    homeDrawn = 1
    awayDrawn = 1
  }

  // If walkover, goals are NOT counted in standings
  const isWalkover = match.status === 'WALKOVER'
  const homeGoals = isWalkover ? 0 : homeScore
  const awayGoals = isWalkover ? 0 : awayScore

  // Update home team standing
  const homeStanding = await tx.standings.findFirst({
    where: {
      tournamentId: match.tournamentId,
      teamId: match.homeTeamId,
      ...(match.group ? { groupName: match.group.name } : {})
    }
  })

  if (homeStanding) {
    await tx.standings.update({
      where: { id: homeStanding.id },
      data: {
        played: { increment: 1 * multiplier },
        won: { increment: homeWon * multiplier },
        drawn: { increment: homeDrawn * multiplier },
        lost: { increment: homeLost * multiplier },
        goalsFor: { increment: homeGoals * multiplier },
        goalsAgainst: { increment: awayGoals * multiplier },
        goalDiff: { increment: (homeGoals - awayGoals) * multiplier },
        points: { increment: homePoints * multiplier }
      }
    })
  }

  // Update away team standing
  const awayStanding = await tx.standings.findFirst({
    where: {
      tournamentId: match.tournamentId,
      teamId: match.awayTeamId,
      ...(match.group ? { groupName: match.group.name } : {})
    }
  })

  if (awayStanding) {
    await tx.standings.update({
      where: { id: awayStanding.id },
      data: {
        played: { increment: 1 * multiplier },
        won: { increment: awayWon * multiplier },
        drawn: { increment: awayDrawn * multiplier },
        lost: { increment: awayLost * multiplier },
        goalsFor: { increment: awayGoals * multiplier },
        goalsAgainst: { increment: homeGoals * multiplier },
        goalDiff: { increment: (awayGoals - homeGoals) * multiplier },
        points: { increment: awayPoints * multiplier }
      }
    })
  }
}
