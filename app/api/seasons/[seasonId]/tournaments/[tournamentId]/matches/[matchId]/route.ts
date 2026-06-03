import { NextRequest, NextResponse } from 'next/server'
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

    // Evaluate achievements ASYNCHRONOUSLY — don't block the response
    // Run in background after responding to user
    if (updatedMatch.shouldEvaluateAchievements) {
      // Fire and forget - don't await
      (async () => {
        try {
          const homeResults = await evaluateTeamAchievements(existingMatch.homeTeam.teamId);
          const awayResults = await evaluateTeamAchievements(existingMatch.awayTeam.teamId);

          // Badge unlocks are tracked but no news generated (only level ups get news)

          // Trigger news for level ups
          if (homeResults?.leveledUp) {
            try {
              await triggerNews('team_level_up', {
                season_id: seasonId,
                metadata: {
                  team_name: existingMatch.homeTeam.team.name,
                  old_level: homeResults.oldLevel,
                  new_level: homeResults.newLevel
                }
              });
            } catch (newsErr) {
              console.warn('[News AI] Failed to generate level up news:', newsErr);
            }
          }

          if (awayResults?.leveledUp) {
            try {
              await triggerNews('team_level_up', {
                season_id: seasonId,
                metadata: {
                  team_name: existingMatch.awayTeam.team.name,
                  old_level: awayResults.oldLevel,
                  new_level: awayResults.newLevel
                }
              });
            } catch (newsErr) {
              console.warn('[News AI] Failed to generate level up news:', newsErr);
            }
          }
        } catch (err) {
          console.error('[Achievements] Background evaluation failed:', err);
        }
      })();
    }

    // Create audit log
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
    })

    // Notify both teams if the match was just completed, walkover, or voided (async - don't block)
    const isNewsWorthy = (status === 'COMPLETED' || status === 'WALKOVER' || status === 'VOID') && 
                         existingMatch.status !== status;
    
    if (isNewsWorthy) {
      // Fire and forget notifications
      (async () => {
        try {
          const homeManagerId = await getTeamManagerId(existingMatch.homeTeam.team.id);
          const awayManagerId = await getTeamManagerId(existingMatch.awayTeam.team.id);
          
          // Set notification title based on status
          const matchTitle = status === 'VOID' ? '🚫 Match Voided' : 
                            status === 'WALKOVER' ? '⚠️ Match Walkover' : 
                            '🏟️ Match Result Published';
          
          let matchBody = `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}`;
          if (status === 'WALKOVER') {
            matchBody += ' (Walkover)';
          } else if (status === 'VOID') {
            matchBody += ' (Voided)';
          } else if (homePenalty !== null && awayPenalty !== null) {
            matchBody += ` (${homePenalty}-${awayPenalty} pens)`;
          }
          
          if (homeManagerId) {
            await sendPushNotificationRaw(homeManagerId, {
              title: matchTitle,
              body: matchBody,
              url: `/team/matches/${matchId}`
            }, 'general').catch(() => {});
          }
          if (awayManagerId) {
            await sendPushNotificationRaw(awayManagerId, {
              title: matchTitle,
              body: matchBody,
              url: `/team/matches/${matchId}`
            }, 'general').catch(() => {});
          }
        } catch (notifErr) {
          console.warn('[Push] Match result notification failed:', notifErr);
        }
        
        // Notify admins
        try {
          const adminTitle = status === 'VOID' ? 'Match Voided' : 
                            status === 'WALKOVER' ? 'Match Walkover' : 
                            'Match Result Published';
          const adminBody = `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}` +
                           (status === 'WALKOVER' ? ' (Walkover)' : status === 'VOID' ? ' (Voided)' : '');
          
          await notifyAllAdmins({
            title: adminTitle,
            body: adminBody,
            url: `/sub-admin/${seasonId}/tournaments/${tournamentId}`
          }, seasonId).catch(() => {});
        } catch (adminNotifErr) {
          console.warn('[Push] Admin match result notification failed:', adminNotifErr);
        }

        // Generate AI news for match completion WITH TOURNAMENT CONTEXT
        try {
          // For VOID matches, generate a simple administrative news article
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
            return; // Exit early for VOID
          }

          // For WALKOVER and COMPLETED matches, generate full news
          const goalDiff = Math.abs(homeScore - awayScore);
          const winner = homeScore > awayScore ? existingMatch.homeTeam.team.name : 
                         awayScore > homeScore ? existingMatch.awayTeam.team.name : null;
          const winnerTeamId = homeScore > awayScore ? existingMatch.homeTeam.teamId : 
                               awayScore > homeScore ? existingMatch.awayTeam.teamId : null;
          
          // Check if this is the first completed match in the round
          const completedMatchesInRound = await prisma.matches.findMany({
            where: {
              tournamentId,
              round: existingMatch.round,
              status: { in: ['COMPLETED', 'WALKOVER'] }
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
          
          // For WALKOVER, use a specific event type, otherwise detect scenario
          let eventType: NewsEventType;
          let scenarioMetadata = {};
          
          if (status === 'WALKOVER') {
            eventType = 'match_walkover';
            scenarioMetadata = {
              is_walkover: true,
              walkover_winner: winner
            };
          } else {
            // Detect the best scenario for this match using advanced scenario detection
            const scenario = await detectMatchScenarios(
              matchId,
              tournamentId,
              existingMatch.homeTeam.teamId,
              existingMatch.awayTeam.teamId,
              homeScore,
              awayScore,
              existingMatch.round ? parseInt(existingMatch.round.match(/\d+/)?.[0] || '1', 10) : 1,
              isFirstMatch,
              homePenalty,
              awayPenalty
            );
            
            eventType = (scenario?.eventType || 'match_completed') as NewsEventType;
            scenarioMetadata = scenario?.metadata || {};
          }

          // Tournament already loaded in existingMatch
          const tournament = existingMatch.tournament;

          // Get tournament context for BOTH teams
          const [homeContext, awayContext] = await Promise.all([
            getTournamentContext(tournamentId, existingMatch.homeTeam.teamId, matchId),
            getTournamentContext(tournamentId, existingMatch.awayTeam.teamId, matchId)
          ]);

          // Generate narrative context
          const homeNarrative = homeContext ? generateContextNarrative(homeContext) : '';
          const awayNarrative = awayContext ? generateContextNarrative(awayContext) : '';

          // Build enriched context string
          let contextString = `Tournament Context:\n\n`;
          if (homeContext) {
            contextString += `${existingMatch.homeTeam.team.name}: ${homeNarrative}\n\n`;
          }
          if (awayContext) {
            contextString += `${existingMatch.awayTeam.team.name}: ${awayNarrative}\n\n`;
          }

          // Add impact analysis
          if (winner && winnerTeamId) {
            const winnerContext = winnerTeamId === existingMatch.homeTeam.teamId ? homeContext : awayContext;
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

          await triggerNews(eventType, {
            season_id: seasonId,
            metadata: {
              home_team: existingMatch.homeTeam.team.name,
              away_team: existingMatch.awayTeam.team.name,
              home_manager: getCleanManagerName(existingMatch.homeTeam.managerName),
              away_manager: getCleanManagerName(existingMatch.awayTeam.managerName),
              home_score: homeScore,
              away_score: awayScore,
              winner,
              goal_diff: goalDiff,
              tournament_name: tournament?.name || 'Tournament',
              round: round || existingMatch.round,
              venue: venue || existingMatch.venue,
              has_penalties: homePenalty !== null && awayPenalty !== null,
              home_penalty: homePenalty,
              away_penalty: awayPenalty,
              // Rich tournament context
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
        } catch (newsErr) {
          console.warn('[News AI] Failed to generate match news:', newsErr);
        }
      })();
    }

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
