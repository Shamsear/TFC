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
    const { auctionDate, endDate, description, positionSlots } = body

    // Get old calendar data for audit
    const oldCalendar = await prisma.auction_calendar.findUnique({
      where: { id: calendarId },
      include: { auctionSlots: true }
    })

    // Get existing slots
    const existingSlots = await prisma.auction_slots.findMany({
      where: { auctionCalendarId: calendarId },
      orderBy: { slotOrder: 'asc' }
    })

    // Generate IDs only for new slots that need to be created
    const newSlotsCount = Math.max(0, (positionSlots?.length || 0) - existingSlots.length)
    const newSlotIds = newSlotsCount > 0 
      ? await Promise.all(Array(newSlotsCount).fill(0).map(() => generateAuctionSlotId()))
      : []

    // Update calendar and slots in a transaction
    const updatedCalendar = await prisma.$transaction(async (tx) => {
      // Calculate endDate if not provided (default to +3 hours from auctionDate)
      const startDate = new Date(auctionDate)
      const calculatedEndDate = endDate ? new Date(endDate) : new Date(startDate.getTime() + 3 * 60 * 60 * 1000)

      // Update calendar
      const calendar = await tx.auction_calendar.update({
        where: {
          id: calendarId,
          seasonId
        },
        data: {
          auctionDate: startDate,
          endDate: calculatedEndDate,
          description,
          updated_by: session.user.id!,
          updatedAt: new Date()
        }
      })

      if (positionSlots && positionSlots.length > 0) {
        // Update existing slots and create new ones
        for (let index = 0; index < positionSlots.length; index++) {
          const slot = positionSlots[index]
          
          if (index < existingSlots.length) {
            // Update existing slot
            await tx.auction_slots.update({
              where: { id: existingSlots[index].id },
              data: {
                position: slot.position,
                position_group: slot.group || 'ALL',
                roundType: slot.roundType || 'normal',
                positionHidden: slot.positionHidden || false,
                slotOrder: index,
                updatedAt: new Date()
              }
            })
          } else {
            // Create new slot
            await tx.auction_slots.create({
              data: {
                id: newSlotIds[index - existingSlots.length],
                auctionCalendarId: calendarId,
                position: slot.position,
                position_group: slot.group || 'ALL',
                roundType: slot.roundType || 'normal',
                positionHidden: slot.positionHidden || false,
                slotOrder: index,
                updatedAt: new Date()
              }
            })
          }
        }

        // Delete extra slots if the new list is shorter
        if (existingSlots.length > positionSlots.length) {
          const slotsToDelete = existingSlots.slice(positionSlots.length).map(s => s.id)
          await tx.auction_slots.deleteMany({
            where: { id: { in: slotsToDelete } }
          })
        }
      } else {
        // Delete all slots if none provided
        await tx.auction_slots.deleteMany({
          where: { auctionCalendarId: calendarId }
        })
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
          endDate: { from: oldCalendar?.endDate, to: endDate },
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
