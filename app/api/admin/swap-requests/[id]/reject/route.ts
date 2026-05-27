import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'

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
    const swapRequest = await prisma.swap_requests.findUnique({
      where: { id },
    })

    if (!swapRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (swapRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Update request status
    await prisma.swap_requests.update({
      where: { id },
      data: {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: session.user.id,
        rejectionReason: reason,
      },
    })

    // Notify requesting team of rejection
    try {
      const fullRequest = await prisma.swap_requests.findUnique({
        where: { id },
        select: { requestingTeamId: true, targetTeam: { select: { name: true } } }
      });
      const reqManagerId = fullRequest?.requestingTeamId
        ? await getTeamManagerId(fullRequest.requestingTeamId)
        : null;
      if (reqManagerId) {
        await sendPushNotificationRaw(reqManagerId, {
          title: '❌ Swap Rejected',
          body: `Your swap request was rejected. Reason: ${reason}`,
          url: '/team/swap-request'
        }, 'trades').catch(() => {});
      }
    } catch (notifErr) {
      console.warn('[Push] Swap reject notification failed (non-fatal):', notifErr);
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error rejecting swap request:', error)
    return NextResponse.json(
      { error: 'Failed to reject swap request' },
      { status: 500 }
    )
  }
}
