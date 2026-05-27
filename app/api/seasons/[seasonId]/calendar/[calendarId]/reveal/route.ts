import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { sendPushNotificationRaw, getTeamManagerId } from '@/lib/notifications-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; calendarId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, calendarId } = await params
    const body = await request.json()
    const { slotIds } = body // Optional: reveal specific slots, or all if not provided

    // Get calendar data before update
    const calendar = await prisma.auction_calendar.findUnique({
      where: { id: calendarId, seasonId },
      include: { auctionSlots: true }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Update slots to reveal positions
    const whereClause = slotIds && slotIds.length > 0
      ? { auctionCalendarId: calendarId, id: { in: slotIds } }
      : { auctionCalendarId: calendarId }

    const result = await prisma.auction_slots.updateMany({
      where: whereClause,
      data: {
        positionHidden: false,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'REVEAL_POSITIONS',
      entityType: 'auction_calendar',
      entityId: calendarId,
      entityName: calendar.description || 'Auction Calendar',
      seasonId,
      details: {
        revealedCount: result.count,
        slotIds: slotIds || 'all',
        auctionDate: calendar.auctionDate
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // Notify all season teams that calendar is revealed
    try {
      const seasonTeams = await prisma.season_teams.findMany({
        where: { seasonId },
        select: { teamId: true }
      });
      const managerIds = (await Promise.all(seasonTeams.map(st => getTeamManagerId(st.teamId)))).filter(Boolean) as string[];
      
      const isPartial = slotIds && slotIds.length > 0;
      await Promise.all(managerIds.map(userId => 
        sendPushNotificationRaw(userId, {
          title: '📅 Auction Order Revealed!',
          body: isPartial ? 'Some auction slots have been revealed. Check the calendar.' : 'The full auction order has been revealed!',
          url: '/team/calendar'
        }, 'general').catch(() => {})
      ));
    } catch (notifErr) {
      console.warn('[Push] Calendar reveal notification failed:', notifErr);
    }

    return NextResponse.json({
      message: `Revealed ${result.count} position(s)`,
      count: result.count
    })
  } catch (error) {
    console.error('Error revealing positions:', error)
    return NextResponse.json(
      { error: 'Failed to reveal positions' },
      { status: 500 }
    )
  }
}
