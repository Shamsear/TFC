import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendPushNotificationRaw, getTeamManagerId, notifyAllAdmins } from '@/lib/notifications-server'

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
    if (!['super_admin', 'sub_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { tournamentId } = await params
    const body = await request.json()
    const { round } = body

    if (!round) {
      return NextResponse.json({ error: 'Round name is required' }, { status: 400 })
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
        round,
        status: 'LIVE' // Only complete the ones that are live
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
      return NextResponse.json({ error: 'No live matches found for this round' }, { status: 404 })
    }

    // Update matches: set to COMPLETED
    await prisma.matches.updateMany({
      where: {
        tournamentId,
        round,
        status: 'LIVE'
      },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    })

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
              title: `Gameweek Stopped`,
              body: `${round} is now closed.`,
              url: `/team/matches`
            },
            'general'
          ).catch(() => {})
        }
      } catch (err) {
        console.error(`Failed to notify team ${teamId} for round stop:`, err)
      }
    }

    try {
      const { seasonId } = await params
      await notifyAllAdmins({
        title: 'Gameweek Stopped',
        body: `${round} has been finalized for ${tournament.name}.`,
        url: `/sub-admin/${seasonId}/tournaments/${tournamentId}`
      }, seasonId)
    } catch (err) {
      console.warn('Failed to notify admins for round stop:', err)
    }

    return NextResponse.json({ success: true, updatedMatches: matchesInRound.length })
  } catch (error: any) {
    console.error('Error stopping round:', error)
    return NextResponse.json({ error: 'Failed to stop round' }, { status: 500 })
  }
}
