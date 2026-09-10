import { prisma } from '@/lib/prisma'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'
import { triggerNews } from '@/lib/news/trigger'

export interface StartRoundResult {
  tournamentId: string
  round: string
  matchesCount: number
  status: 'started' | 'already_live' | 'no_matches' | 'error'
  error?: string
}

/**
 * Starts a specific round in a tournament, setting all its matches to LIVE.
 * If deadline is provided, updates matchDate to that deadline; otherwise preserves existing matchDate.
 */
export async function startTournamentRound({
  tournamentId,
  round,
  deadline
}: {
  tournamentId: string
  round: string
  deadline?: Date
}): Promise<StartRoundResult> {
  try {
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId },
      include: { season: true }
    })

    if (!tournament) {
      return { tournamentId, round, matchesCount: 0, status: 'error', error: 'Tournament not found' }
    }

    // Find all matches in this round
    const matchesInRound = await prisma.matches.findMany({
      where: {
        tournamentId,
        round
      },
      include: {
        homeTeam: { include: { team: true } },
        awayTeam: { include: { team: true } }
      }
    })

    if (matchesInRound.length === 0) {
      return { tournamentId, round, matchesCount: 0, status: 'no_matches' }
    }

    // Check if any matches are scheduled or not yet live/completed
    const scheduledMatches = matchesInRound.filter(m => m.status === 'SCHEDULED')
    if (scheduledMatches.length === 0 && !deadline) {
      return { tournamentId, round, matchesCount: matchesInRound.length, status: 'already_live' }
    }

    // Atomic update to LIVE
    const updateData: any = {
      status: 'LIVE',
      updatedAt: new Date()
    }
    if (deadline) {
      updateData.matchDate = deadline
    }

    const updateResult = await prisma.matches.updateMany({
      where: {
        tournamentId,
        round,
        ...(deadline ? {} : { status: 'SCHEDULED' })
      },
      data: updateData
    })

    if (updateResult.count === 0 && !deadline) {
      return { tournamentId, round, matchesCount: matchesInRound.length, status: 'already_live' }
    }

    // Update tournament status to IN_PROGRESS if currently UPCOMING
    if (tournament.status === 'UPCOMING') {
      await prisma.tournaments.update({
        where: { id: tournamentId },
        data: {
          status: 'IN_PROGRESS',
          updatedAt: new Date()
        }
      }).catch(err => console.warn(`[AutoStart] Failed to update tournament status:`, err))
    }

    // Determine deadline string for notifications
    const targetDeadline = deadline || (matchesInRound[0]?.matchDate ? new Date(matchesInRound[0].matchDate) : null)
    const formattedDeadline = targetDeadline
      ? targetDeadline.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })
      : 'the scheduled deadline'

    // Notify all distinct teams involved in this round
    const uniqueTeamIds = new Set<string>()
    matchesInRound.forEach(m => {
      uniqueTeamIds.add(m.homeTeam.team.id)
      uniqueTeamIds.add(m.awayTeam.team.id)
    })

    for (const teamId of uniqueTeamIds) {
      try {
        const managerId = await getTeamManagerId(teamId)
        if (managerId) {
          await sendPushNotificationRaw(
            managerId,
            {
              title: `⚽ Gameweek Started`,
              body: `${round} is now LIVE. You can play your match until ${formattedDeadline}.`,
              url: `/team/matches`
            },
            'general'
          ).catch(() => {})
        }
      } catch (err) {
        console.error(`[AutoStart] Failed to notify team ${teamId} for round start:`, err)
      }
    }

    // Notify admins
    try {
      await notifyAllAdmins({
        title: '⚽ Gameweek Started',
        body: `${round} has been started for ${tournament.name}.`,
        url: `/sub-admin/${tournament.seasonId}/tournaments/${tournamentId}`
      }, tournament.seasonId)
    } catch (err) {
      console.warn('[AutoStart] Failed to notify admins for round start:', err)
    }

    // Trigger news overview article
    try {
      if (tournament.season && matchesInRound.length > 0) {
        const matchList = matchesInRound.map(m =>
          `${m.homeTeam.team.name} vs ${m.awayTeam.team.name}`
        ).join(', ')

        await triggerNews('matchday_started', {
          season_id: tournament.seasonId,
          season_name: tournament.season.name,
          metadata: {
            tournament_name: tournament.name,
            round: round,
            match_count: matchesInRound.length,
            deadline: formattedDeadline,
            matches: matchList
          }
        })
      }
    } catch (newsErr) {
      console.warn('[AutoStart] Failed to generate matchday overview news:', newsErr)
    }

    return {
      tournamentId,
      round,
      matchesCount: updateResult.count,
      status: 'started'
    }
  } catch (error: any) {
    console.error(`[AutoStart] Error starting round ${round} in tournament ${tournamentId}:`, error)
    return {
      tournamentId,
      round,
      matchesCount: 0,
      status: 'error',
      error: error?.message || 'Unknown error'
    }
  }
}

/**
 * Checks all SCHEDULED matches whose startDate has arrived or passed (startDate <= now)
 * and automatically starts the corresponding gameweeks/rounds.
 * 
 * Can be filtered by tournamentId, seasonId, or runs across all tournaments.
 */
export async function autoStartDueTournamentRounds(
  tournamentId?: string,
  seasonId?: string
): Promise<StartRoundResult[]> {
  try {
    const now = new Date()

    const where: any = {
      status: 'SCHEDULED',
      round: { not: null },
      startDate: {
        not: null,
        lte: now
      }
    }

    if (tournamentId) {
      where.tournamentId = tournamentId
    } else if (seasonId) {
      where.tournament = {
        seasonId
      }
    }

    // Find all scheduled matches whose start date has arrived
    const dueMatches = await prisma.matches.findMany({
      where,
      select: {
        id: true,
        tournamentId: true,
        round: true,
        startDate: true,
        matchDate: true
      },
      orderBy: {
        startDate: 'asc'
      }
    })

    if (dueMatches.length === 0) {
      return []
    }

    // Group due matches by tournamentId + round
    const groupedDueRounds = new Map<string, { tournamentId: string; round: string }>()
    dueMatches.forEach(m => {
      if (!m.round) return
      const key = `${m.tournamentId}::${m.round}`
      if (!groupedDueRounds.has(key)) {
        groupedDueRounds.set(key, { tournamentId: m.tournamentId, round: m.round })
      }
    })

    const results: StartRoundResult[] = []

    for (const { tournamentId: tId, round } of Array.from(groupedDueRounds.values())) {
      const result = await startTournamentRound({
        tournamentId: tId,
        round
      })
      results.push(result)
    }

    return results
  } catch (error) {
    console.error('[AutoStart] Error in autoStartDueTournamentRounds:', error)
    return []
  }
}
