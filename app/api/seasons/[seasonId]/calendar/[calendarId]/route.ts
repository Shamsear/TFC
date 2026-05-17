import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { generateAuctionSlotId } from '@/lib/id-generator'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; calendarId: string }> }
) {
  try {
    const { seasonId, calendarId } = await params

    const calendar = await prisma.auction_calendar.findUnique({
      where: {
        id: calendarId,
        seasonId
      },
      include: {
        auctionSlots: {
          orderBy: {
            slotOrder: 'asc'
          }
        }
      }
    })

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; calendarId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, calendarId } = await params
    const body = await request.json()
    const { auctionDate, description, positionSlots } = body

    // Get old calendar data for audit
    const oldCalendar = await prisma.auction_calendar.findUnique({
      where: { id: calendarId },
      include: { auctionSlots: true }
    })

    // Update calendar and slots in a transaction
    const updatedCalendar = await prisma.$transaction(async (tx) => {
      // Update calendar
      const calendar = await tx.auction_calendar.update({
        where: {
          id: calendarId,
          seasonId
        },
        data: {
          auctionDate: new Date(auctionDate),
          description,
          updated_by: session.user.id!,
          updatedAt: new Date()
        }
      })

      // Delete existing slots
      await tx.auction_slots.deleteMany({
        where: { auctionCalendarId: calendarId }
      })

      // Create new slots
      if (positionSlots && positionSlots.length > 0) {
        for (let index = 0; index < positionSlots.length; index++) {
          const slot = positionSlots[index]
          const slotId = await generateAuctionSlotId()
          await tx.auction_slots.create({
            data: {
              id: slotId,
              auctionCalendarId: calendarId,
              position: slot.position,
              position_group: slot.group || 'ALL',
              slotOrder: index,
              updatedAt: new Date()
            }
          })
        }
      }

      return calendar
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id!,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'UPDATE_CALENDAR_EVENT',
      entityType: 'auction_calendar',
      entityId: calendarId,
      entityName: description || 'Auction Calendar',
      seasonId,
      details: {
        changes: {
          auctionDate: { from: oldCalendar?.auctionDate, to: auctionDate },
          description: { from: oldCalendar?.description, to: description },
          positionSlots: { 
            from: oldCalendar?.auctionSlots.map(s => ({ position: s.position, group: s.position_group })), 
            to: positionSlots 
          }
        }
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(updatedCalendar)
  } catch (error) {
    console.error('Error updating calendar:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string; calendarId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId, calendarId } = await params

    // Get calendar data before deletion for audit
    const calendar = await prisma.auction_calendar.findUnique({
      where: { id: calendarId },
      include: { auctionSlots: true }
    })

    // Delete calendar (slots will be deleted automatically due to cascade)
    await prisma.auction_calendar.delete({
      where: {
        id: calendarId,
        seasonId
      }
    })

    // Create audit log
    if (calendar) {
      await createAuditLog({
        userId: session.user.id!,
        userEmail: session.user.email!,
        userRole: session.user.role!,
        action: 'DELETE_CALENDAR_EVENT',
        entityType: 'auction_calendar',
        entityId: calendarId,
        entityName: calendar.description || 'Auction Calendar',
        seasonId,
        details: {
          auctionDate: calendar.auctionDate,
          positions: calendar.auctionSlots.map(s => s.position)
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    )
  }
}
