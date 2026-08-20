import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAllAdmins } from '@/lib/notifications-server'
import { randomUUID } from 'crypto'
import { triggerNews } from '@/lib/news/trigger'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, teamId, retentions } = body

    // Verify team ownership
    if (teamId !== session.user.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify there is an active retention window
    const activeWindow = await prisma.retention_windows.findFirst({
      where: { 
        seasonId,
        status: 'ACTIVE'
      }
    })

    if (!activeWindow) {
      return NextResponse.json({ error: 'No active retention window found' }, { status: 400 })
    }

    // Check if team is banned from retention
    const bannedTeamIds = activeWindow.bannedTeamIds ? JSON.parse(activeWindow.bannedTeamIds) : []
    if (bannedTeamIds.includes(teamId)) {
      return NextResponse.json({ error: 'Your team is not allowed to use retention feature' }, { status: 403 })
    }

    const MAX_RETENTIONS_PER_TEAM = activeWindow.retentionLimit || 3

    // Check total retention requests (all statuses) in the current window
    const totalRequestsCount = await prisma.retention_requests.count({
      where: {
        seasonId,
        teamId,
        retentionWindowId: activeWindow.id,
      },
    })

    // Check if adding these retentions would exceed the total request limit for the window
    if (totalRequestsCount + retentions.length > MAX_RETENTIONS_PER_TEAM) {
      const remaining = MAX_RETENTIONS_PER_TEAM - totalRequestsCount
      return NextResponse.json(
        { 
          error: `You can only submit ${MAX_RETENTIONS_PER_TEAM} retention requests per window. You have ${remaining} request${remaining !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      )
    }

    // Also check approved retentions count in the current window
    const approvedRetentionsCount = await prisma.retention_requests.count({
      where: {
        seasonId,
        teamId,
        retentionWindowId: activeWindow.id,
        status: 'approved',
      },
    })

    // Check if adding these retentions would exceed the approved limit for the window
    if (approvedRetentionsCount + retentions.length > MAX_RETENTIONS_PER_TEAM) {
      const remaining = MAX_RETENTIONS_PER_TEAM - approvedRetentionsCount
      return NextResponse.json(
        { 
          error: `You can only have ${MAX_RETENTIONS_PER_TEAM} approved retentions per window. You have ${remaining} approval${remaining !== 1 ? 's' : ''} remaining.` 
        },
        { status: 400 }
      )
    }

    // Get current season number
    const currentSeason = await prisma.seasons.findUnique({
      where: { id: seasonId },
      select: { seasonNumber: true }
    })

    if (!currentSeason) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Get previous season (seasonNumber - 1)
    const previousSeason = await prisma.seasons.findFirst({
      where: {
        seasonNumber: currentSeason.seasonNumber - 1
      }
    })

    if (!previousSeason) {
      return NextResponse.json({ error: 'Previous season not found' }, { status: 404 })
    }

    // Get current window timestamp
    const windowOpenedAt = new Date()

    // Create retention requests
    const requests = await Promise.all(
      retentions.map(async (retention: any) => {
        // Verify player was in team's previous season squad
        const previousTransfer = await prisma.transfer_history.findFirst({
          where: {
            seasonId: previousSeason.id,
            teamId,
            basePlayerId: retention.playerId,
            status: 'ACTIVE',
          },
        })

        if (!previousTransfer) {
          throw new Error(`Player ${retention.playerName} was not in your squad during ${previousSeason.name}`)
        }

        // Verify team participated in previous season
        const previousSeasonTeam = await prisma.season_teams.findFirst({
          where: {
            seasonId: previousSeason.id,
            teamId
          }
        })

        if (!previousSeasonTeam) {
          throw new Error(`Your team did not participate in ${previousSeason.name}`)
        }

        // Check if player is already in current season squad
        const existingTransfer = await prisma.transfer_history.findFirst({
          where: {
            seasonId,
            teamId,
            basePlayerId: retention.playerId,
            status: 'ACTIVE',
          },
        })

        if (existingTransfer) {
          throw new Error(`Player ${retention.playerName} is already in your current squad`)
        }

        // Check if request already exists for this player in this season
        const existing = await prisma.retention_requests.findFirst({
          where: {
            seasonId,
            teamId,
            playerId: retention.playerId,
            status: 'pending',
          },
        })

        if (existing) {
          throw new Error(`Retention request for ${retention.playerName} already exists`)
        }

        // Create request
        return prisma.retention_requests.create({
          data: {
            id: randomUUID(),
            seasonId,
            teamId,
            playerId: retention.playerId,
            playerName: retention.playerName,
            oldSquadValue: retention.oldSquadValue,
            previousSeasonId: previousSeason.id,
            notes: retention.notes || null,
            status: 'pending',
            windowOpenedAt,
            retentionWindowId: activeWindow.id
          },
        })
      })
    )

    // Notify Admins
    try {
      const teamData = await prisma.teams.findUnique({ where: { id: teamId }, select: { name: true } });
      await notifyAllAdmins({
        title: '🔄 New Retention Request',
        body: `${teamData?.name || 'A team'} has requested to retain ${requests.length} player(s).`,
        url: `/sub-admin/${seasonId}/transfers`
      }, seasonId);
    } catch (notifErr) {
      console.warn('[Push] Admin retention request notification failed:', notifErr);
    }

    // Trigger news for retention request submission
    try {
      const teamData = await prisma.teams.findUnique({ 
        where: { id: teamId }, 
        select: { name: true } 
      });
      const season = await prisma.seasons.findUnique({
        where: { id: seasonId },
        select: { name: true }
      });
      
      if (teamData && season) {
        await triggerNews('retention_request_submitted', {
          season_id: seasonId,
          season_name: season.name,
          metadata: {
            team_name: teamData.name,
            player_count: requests.length,
            player_names: requests.map(r => r.playerName).join(', '),
            total_value: requests.reduce((sum, r) => sum + r.oldSquadValue, 0),
            previous_season: previousSeason.name
          }
        });
      }
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate retention request news:', newsErr);
    }

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error creating retention requests:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create retention requests' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.teamId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get all retention requests for this team
    const requests = await prisma.retention_requests.findMany({
      where: {
        seasonId,
        teamId: session.user.teamId,
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true,
          },
        },
        previousSeason: {
          select: {
            id: true,
            name: true,
            seasonNumber: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    })

    // Verify there is an active retention window
    const activeWindow = await prisma.retention_windows.findFirst({
      where: { 
        seasonId,
        status: 'ACTIVE'
      }
    })

    const maxRetentions = activeWindow?.retentionLimit || 3

    // Check if team is banned
    const isBanned = activeWindow?.bannedTeamIds 
      ? JSON.parse(activeWindow.bannedTeamIds).includes(session.user.teamId)
      : false

    // Count total requests (all statuses) in the current active window if it exists, otherwise overall
    const totalRequestsCount = await prisma.retention_requests.count({
      where: {
        seasonId,
        teamId: session.user.teamId,
        ...(activeWindow && { retentionWindowId: activeWindow.id }),
      },
    })

    // Count approved retentions in the current active window if it exists, otherwise overall
    const approvedCount = await prisma.retention_requests.count({
      where: {
        seasonId,
        teamId: session.user.teamId,
        status: 'approved',
        ...(activeWindow && { retentionWindowId: activeWindow.id }),
      },
    })

    return NextResponse.json({ 
      requests,
      totalRequestsCount,
      approvedCount,
      maxRetentions,
      isBanned,
      remainingRequests: Math.max(0, maxRetentions - totalRequestsCount),
      remainingApprovals: Math.max(0, maxRetentions - approvedCount),
      activeWindow: activeWindow ? {
        id: activeWindow.id,
        name: activeWindow.name,
        startDate: activeWindow.startDate,
        endDate: activeWindow.endDate,
        status: activeWindow.status,
      } : null,
    })
  } catch (error: any) {
    console.error('Error fetching retention requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retention requests' },
      { status: 500 }
    )
  }
}
