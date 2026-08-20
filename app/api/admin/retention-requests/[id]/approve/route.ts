import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'
import { triggerNews } from '@/lib/news/trigger'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the request
    const retentionRequest = await prisma.retention_requests.findUnique({
      where: { id },
      include: {
        team: true,
        season: true,
        previousSeason: true,
      },
    })

    if (!retentionRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (retentionRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Perform the retention in a transaction with increased timeout
    await prisma.$transaction(async (tx) => {
      // 1. Get season team
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: retentionRequest.seasonId,
            teamId: retentionRequest.teamId,
          },
        },
      })

      if (!seasonTeam) {
        throw new Error('Season team not found')
      }

      // 2. Check if team has enough budget
      if (seasonTeam.currentBudget < retentionRequest.oldSquadValue) {
        throw new Error(`Insufficient budget. Required: £${retentionRequest.oldSquadValue.toLocaleString()}, Available: £${seasonTeam.currentBudget.toLocaleString()}`)
      }

      // 3. Deduct the old squad value from budget
      const newBalance = seasonTeam.currentBudget - retentionRequest.oldSquadValue

      await tx.season_teams.update({
        where: { id: seasonTeam.id },
        data: { currentBudget: newBalance },
      })

      // 4. Create transfer_history entry (player now in current season squad)
      await tx.transfer_history.create({
        data: {
          id: randomUUID(),
          basePlayerId: retentionRequest.playerId,
          seasonId: retentionRequest.seasonId,
          teamId: retentionRequest.teamId,
          soldPrice: retentionRequest.oldSquadValue,
          acquisitionType: 'retention',
          acquisitionNotes: `Retained from ${retentionRequest.previousSeason.name} at value £${retentionRequest.oldSquadValue.toLocaleString()}`,
          status: 'ACTIVE',
          seasonTeamId: seasonTeam.id,
        },
      })

      // 5. Create ledger entry
      await tx.financial_ledger.create({
        data: {
          id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          seasonTeamId: seasonTeam.id,
          seasonId: retentionRequest.seasonId,
          transactionType: 'PLAYER_PURCHASE',
          amount: -retentionRequest.oldSquadValue,
          previousBalance: seasonTeam.currentBudget,
          newBalance,
          description: `Player retention: ${retentionRequest.playerName} from ${retentionRequest.previousSeason.name}`,
          playerName: retentionRequest.playerName,
        },
      })

      // 6. Create retention record (for tracking)
      await tx.retentions.create({
        data: {
          id: randomUUID(),
          seasonId: retentionRequest.seasonId,
          basePlayerId: retentionRequest.playerId,
          retainedFromSeasonId: retentionRequest.previousSeasonId,
        },
      })

      // 7. Update request status
      await tx.retention_requests.update({
        where: { id },
        data: {
          status: 'approved',
          processedAt: new Date(),
          processedBy: session.user.id,
        },
      })
    }, {
      maxWait: 10000, // 10 seconds max wait to acquire a connection
      timeout: 30000, // 30 seconds transaction timeout
    })

    // Notify the team manager about the approved retention
    try {
      const managerId = await getTeamManagerId(retentionRequest.teamId);
      if (managerId) {
        await sendPushNotificationRaw(managerId, {
          title: '✅ Retention Approved',
          body: `${retentionRequest.playerName} has been retained for £${retentionRequest.oldSquadValue.toLocaleString()}. Player added to your squad.`,
          url: '/team/retention-request'
        }, 'trades').catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[Push] Retention approve notification failed (non-fatal):', notifErr);
    }

    // Generate AI news for retention approval
    try {
      await triggerNews('retention_request_approved', {
        season_id: retentionRequest.seasonId,
        season_name: retentionRequest.season.name,
        metadata: {
          team_name: retentionRequest.team.name,
          player_name: retentionRequest.playerName,
          retention_value: retentionRequest.oldSquadValue,
          previous_season: retentionRequest.previousSeason.name
        }
      });
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate retention approval news:', newsErr);
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error approving retention request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve retention request' },
      { status: 500 }
    )
  }
}
