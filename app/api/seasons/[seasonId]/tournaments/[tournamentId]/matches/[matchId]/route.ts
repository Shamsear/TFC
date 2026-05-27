import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string; matchId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { matchId } = await params
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

      // Update standings if match is completed and has scores
      if (status === 'COMPLETED' && homeScore !== null && awayScore !== null) {
        // Only update if this is a new completion or scores changed
        const shouldUpdateStandings = 
          existingMatch.status !== 'COMPLETED' ||
          existingMatch.homeScore !== homeScore ||
          existingMatch.awayScore !== awayScore

        if (shouldUpdateStandings) {
          // Revert old scores if match was previously completed
          if (existingMatch.status === 'COMPLETED' && existingMatch.homeScore !== null && existingMatch.awayScore !== null) {
            await updateStandings(tx, existingMatch, true) // Revert
          }

          // Apply new scores
          await updateStandings(tx, { ...match, homeTeam: existingMatch.homeTeam, awayTeam: existingMatch.awayTeam, group: existingMatch.group }, false)
        }
      }

      return match
    })

    // Create audit log
    const { seasonId } = await params
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

    // Notify both teams if the match was just completed
    if (status === 'COMPLETED' && existingMatch.status !== 'COMPLETED') {
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
        goalsFor: { increment: homeScore * multiplier },
        goalsAgainst: { increment: awayScore * multiplier },
        goalDiff: { increment: (homeScore - awayScore) * multiplier },
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
        goalsFor: { increment: awayScore * multiplier },
        goalsAgainst: { increment: homeScore * multiplier },
        goalDiff: { increment: (awayScore - homeScore) * multiplier },
        points: { increment: awayPoints * multiplier }
      }
    })
  }
}
