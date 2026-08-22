import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'
import { triggerNews } from '@/lib/news/trigger'

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
    const body = await request.json()
    const { reason } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Rejection reason required' }, { status: 400 })
    }

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

    // Update request status
    await prisma.retention_requests.update({
      where: { id },
      data: {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: session.user.id,
        rejectionReason: reason,
      },
    })

    // Notify the team manager about the rejection
    try {
      const managerId = await getTeamManagerId(retentionRequest.teamId);
      if (managerId) {
        await sendPushNotificationRaw(managerId, {
          title: '❌ Retention Rejected',
          body: `Your retention request for ${retentionRequest.playerName} was rejected. Reason: ${reason}`,
          url: '/team/retention-request'
        }, 'trades').catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[Push] Retention reject notification failed (non-fatal):', notifErr);
    }

    // Trigger news for retention request rejection
    try {
      await triggerNews('retention_request_rejected', {
        season_id: retentionRequest.seasonId,
        season_name: retentionRequest.season.name,
        metadata: {
          team_name: retentionRequest.team.name,
          player_name: retentionRequest.playerName,
          rejection_reason: reason,
          previous_season: retentionRequest.previousSeason.name
        }
      });
    } catch (newsErr) {
      console.warn('[News AI] Failed to generate retention rejection news:', newsErr);
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rejecting retention request:', error)
    return NextResponse.json(
      { error: 'Failed to reject retention request' },
      { status: 500 }
    )
  }
}
