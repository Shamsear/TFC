import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'
import { triggerNews } from '@/lib/news/trigger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; tournamentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow sub-admins and super-admins
    if (!['SUPER_ADMIN', 'SUB_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { seasonId, tournamentId } = await params
    const body = await request.json()
    const { round, deadline } = body

    if (!round || !deadline) {
      return NextResponse.json({ error: 'Round name and deadline are required' }, { status: 400 })
    }

    const parsedDeadline = new Date(deadline)
    if (isNaN(parsedDeadline.getTime())) {
      return NextResponse.json({ error: 'Invalid deadline date format' }, { status: 400 })
    }

    // Get tournament to check if it exists
    const tournament = await prisma.tournaments.findUnique({
      where: { id: tournamentId }
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // First find all matches in this round to know which teams are involved
    const matchesInRound = await prisma.matches.findMany({
      where: {
        tournamentId,
        round
      },
      include: {
        homeTeam: {
          include: { team: true }
        },
        awayTeam: {
          include: { team: true }
        }
      }
    })

    if (matchesInRound.length === 0) {
      return NextResponse.json({ error: 'No matches found for this round' }, { status: 404 })
    }

    // Update matches: set to LIVE and update matchDate to deadline
    await prisma.matches.updateMany({
      where: {
        tournamentId,
        round
      },
      data: {
        status: 'LIVE',
        matchDate: parsedDeadline,
        updatedAt: new Date()
      }
    })

    // Notify all distinct teams involved in this round
    const uniqueTeamIds = new Set<string>()
    matchesInRound.forEach(m => {
      uniqueTeamIds.add(m.homeTeam.team.id)
      uniqueTeamIds.add(m.awayTeam.team.id)
    })

    const formattedDeadline = parsedDeadline.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
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
        console.error(`Failed to notify team ${teamId} for round start:`, err)
      }
    }

    try {
      await notifyAllAdmins({
        title: '⚽ Gameweek Started',
        body: `${round} has been started for ${tournament.name}.`,
        url: `/sub-admin/${seasonId}/tournaments/${tournamentId}`
      }, seasonId)
    } catch (err) {
      console.warn('Failed to notify admins for round start:', err)
    }

    // Trigger news for match started
    try {
      const season = await prisma.seasons.findUnique({
        where: { id: seasonId },
        select: { name: true }
      });

      if (season) {
        await triggerNews('match_started', {
          season_id: seasonId,
          season_name: season.name,
          metadata: {
            tournament_name: tournament.name,
            round: round,
            match_count: matchesInRound.length,
            deadline: formattedDeadline
          }
        });
      }
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate match started news:', newsErr);
    }

    return NextResponse.json({ success: true, updatedMatches: matchesInRound.length })
  } catch (error: any) {
    console.error('Error starting round:', error)
    return NextResponse.json({ error: 'Failed to start round' }, { status: 500 })
  }
}
