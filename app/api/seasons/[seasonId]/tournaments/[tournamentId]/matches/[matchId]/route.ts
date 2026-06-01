import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'
import { evaluateTeamAchievements } from '@/lib/achievements-engine'
import { triggerNews } from '@/lib/news/trigger'

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
        group: true
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

          // Trigger news for badge unlocks
          if (homeResults?.newBadgesUnlocked && homeResults.newBadgesUnlocked.length > 0) {
            for (const badge of homeResults.newBadgesUnlocked) {
              try {
                await triggerNews('badge_unlocked', {
                  season_id: badge.seasonId || seasonId,
                  metadata: {
                    team_name: existingMatch.homeTeam.team.name,
                    badge_name: badge.def?.name || badge.key,
                    badge_tier: badge.def?.tier || 'BRONZE',
                    xp_earned: badge.def?.xpAward || 50
                  }
                });
              } catch (newsErr) {
                console.warn('[News AI] Failed to generate badge unlock news:', newsErr);
              }
            }
          }

          if (awayResults?.newBadgesUnlocked && awayResults.newBadgesUnlocked.length > 0) {
            for (const badge of awayResults.newBadgesUnlocked) {
              try {
                await triggerNews('badge_unlocked', {
                  season_id: badge.seasonId || seasonId,
                  metadata: {
                    team_name: existingMatch.awayTeam.team.name,
                    badge_name: badge.def?.name || badge.key,
                    badge_tier: badge.def?.tier || 'BRONZE',
                    xp_earned: badge.def?.xpAward || 50
                  }
                });
              } catch (newsErr) {
                console.warn('[News AI] Failed to generate badge unlock news:', newsErr);
              }
            }
          }

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

    // Notify both teams if the match was just completed (async - don't block)
    if (status === 'COMPLETED' && existingMatch.status !== 'COMPLETED') {
      // Fire and forget notifications
      (async () => {
        try {
          const homeManagerId = await getTeamManagerId(existingMatch.homeTeam.team.id);
          const awayManagerId = await getTeamManagerId(existingMatch.awayTeam.team.id);
          const matchTitle = `🏟️ Match Result Published`;
          let matchBody = `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}`;
          if (homePenalty !== null && awayPenalty !== null) {
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
          await notifyAllAdmins({
            title: 'Match Result Published',
            body: `${existingMatch.homeTeam.team.name} ${homeScore} - ${awayScore} ${existingMatch.awayTeam.team.name}`,
            url: `/sub-admin/${seasonId}/tournaments/${tournamentId}`
          }, seasonId).catch(() => {});
        } catch (adminNotifErr) {
          console.warn('[Push] Admin match result notification failed:', adminNotifErr);
        }

        // Generate AI news for match completion
        try {
          const goalDiff = Math.abs(homeScore - awayScore);
          const winner = homeScore > awayScore ? existingMatch.homeTeam.team.name : 
                         awayScore > homeScore ? existingMatch.awayTeam.team.name : null;
          
          // Determine specific event type
          let eventType: any = 'match_completed';
          if (goalDiff >= 5) {
            eventType = 'thrashing';
          } else if (goalDiff === 1) {
            eventType = 'close_match';
          } else if (homeScore === 0 && awayScore === 0) {
            eventType = 'boring_draw';
          } else if ((homeScore + awayScore) >= 6) {
            eventType = 'high_scoring';
          }
          
          // Check for penalty shootout
          if (homePenalty !== null && awayPenalty !== null) {
            eventType = 'penalty_shootout';
          }

          // Get tournament name for news
          const tournament = await prisma.tournaments.findUnique({
            where: { id: tournamentId },
            select: { name: true }
          });

          await triggerNews(eventType, {
            season_id: seasonId,
            metadata: {
              home_team: existingMatch.homeTeam.team.name,
              away_team: existingMatch.awayTeam.team.name,
              home_score: homeScore,
              away_score: awayScore,
              winner,
              goal_diff: goalDiff,
              tournament_name: tournament?.name || 'Tournament',
              round: round || existingMatch.round,
              venue: venue || existingMatch.venue,
              has_penalties: homePenalty !== null && awayPenalty !== null,
              home_penalty: homePenalty,
              away_penalty: awayPenalty
            }
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
