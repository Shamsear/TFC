import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'

export const runtime = 'nodejs'
export const maxDuration = 30

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

    // Get the retention request
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

    if (retentionRequest.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved requests can be reverted' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // 1. Find and remove the transfer_history entry
      const transfer = await tx.transfer_history.findFirst({
        where: {
          basePlayerId: retentionRequest.playerId,
          seasonId: retentionRequest.seasonId,
          teamId: retentionRequest.teamId,
          acquisitionType: 'retention',
          status: 'ACTIVE',
        },
      })

      if (transfer) {
        await tx.transfer_history.delete({ where: { id: transfer.id } })
      }

      // 2. Reverse the budget deduction
      const seasonTeam = await tx.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: retentionRequest.seasonId,
            teamId: retentionRequest.teamId,
          },
        },
      })

      if (seasonTeam) {
        const restoredBudget = seasonTeam.currentBudget + retentionRequest.oldSquadValue
        await tx.season_teams.update({
          where: { id: seasonTeam.id },
          data: { currentBudget: restoredBudget },
        })

        // 3. Remove the ledger entry
        await tx.financial_ledger.deleteMany({
          where: {
            seasonTeamId: seasonTeam.id,
            seasonId: retentionRequest.seasonId,
            transactionType: 'PLAYER_PURCHASE',
            playerName: retentionRequest.playerName,
          },
        })
      }

      // 4. Remove the retentions record
      await tx.retentions.deleteMany({
        where: {
          seasonId: retentionRequest.seasonId,
          basePlayerId: retentionRequest.playerId,
          retainedFromSeasonId: retentionRequest.previousSeasonId,
        },
      })

      // 5. Update request status back to pending
      await tx.retention_requests.update({
        where: { id },
        data: {
          status: 'pending',
          processedAt: null,
          processedBy: null,
        },
      })
    }, {
      maxWait: 10000,
      timeout: 30000,
    })

    // Notify the team manager
    try {
      const managerId = await getTeamManagerId(retentionRequest.teamId)
      if (managerId) {
        await sendPushNotificationRaw(managerId, {
          title: '↩️ Retention Reverted',
          body: `Retention for ${retentionRequest.playerName} has been reverted. £${retentionRequest.oldSquadValue.toLocaleString()} has been restored to your budget.`,
          url: '/team/retention-request'
        }, 'trades').catch(() => {})
      }
    } catch (notifErr) {
      console.warn('[Push] Retention revert notification failed (non-fatal):', notifErr)
    }

    return NextResponse.json({
      success: true,
      message: `Retention for ${retentionRequest.playerName} reverted. £${retentionRequest.oldSquadValue.toLocaleString()} restored to budget.`,
    })
  } catch (error: any) {
    console.error('Error reverting retention request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to revert retention request' },
      { status: 500 }
    )
  }
}
