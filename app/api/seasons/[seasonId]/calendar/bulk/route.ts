import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const body = await request.json()
    const { auctionDates } = body

    if (!auctionDates || !Array.isArray(auctionDates) || auctionDates.length === 0) {
      return NextResponse.json(
        { error: 'Auction dates array is required' },
        { status: 400 }
      )
    }

    // Create all auction dates and their slots in a transaction
    const created = await prisma.$transaction(async (tx) => {
      const results = []

      for (const auction of auctionDates) {
        const { auctionDate, description, positions } = auction

        if (!auctionDate || !positions || positions.length === 0) {
          throw new Error('Each auction must have a date and at least one position')
        }

        // Create auction calendar entry
        const calendar = await tx.auction_calendar.create({
          data: {
            id: `calendar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            seasonId,
            auctionDate: new Date(auctionDate),
            description: description || null,
            updatedAt: new Date()
          }
        })

        // Create position slots
        for (let i = 0; i < positions.length; i++) {
          await tx.auction_slots.create({
            data: {
              id: `slot-${calendar.id}-${i}`,
              auctionCalendarId: calendar.id,
              position: positions[i],
              slotOrder: i,
              updatedAt: new Date()
            }
          })
        }

        results.push(calendar)
      }

      return results
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_CALENDAR_EVENT',
      entityType: 'auction_calendar',
      entityId: seasonId,
      entityName: 'Bulk Auction Calendars',
      seasonId,
      details: {
        calendarCount: created.length,
        auctionDates: auctionDates.map((a: any) => ({
          date: a.auctionDate,
          positionCount: a.positions?.length || 0
        }))
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      message: `Created ${created.length} auction dates`,
      calendars: created
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating auction dates:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create auction dates' },
      { status: 500 }
    )
  }
}
