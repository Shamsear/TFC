import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import { generateAuctionId, generateAuctionSlotId } from '@/lib/id-generator'

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
    const { auctionDate, description, positions } = body

    if (!auctionDate || !positions || positions.length === 0) {
      return NextResponse.json(
        { error: 'Auction date and positions are required' },
        { status: 400 }
      )
    }

    // Check if season exists
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    const calendarId = await generateAuctionId()

    // Create auction calendar with slots
    const calendar = await prisma.$executeRaw`
      INSERT INTO auction_calendar (
        id, season_id, auction_date, description, 
        created_by, created_at, updated_at
      ) VALUES (
        ${calendarId},
        ${seasonId},
        ${new Date(auctionDate)},
        ${description || null},
        ${session.user.id},
        NOW(),
        NOW()
      )
    `

    // Create slots
    for (let i = 0; i < positions.length; i++) {
      const slotId = await generateAuctionSlotId()
      await prisma.$executeRaw`
        INSERT INTO auction_slots (
          id, auction_calendar_id, position, slot_order, updated_at
        ) VALUES (
          ${slotId},
          ${calendarId},
          ${positions[i]},
          ${i},
          NOW()
        )
      `
    }

    // Get created calendar with slots
    const createdCalendar = await prisma.auction_calendar.findUnique({
      where: { id: calendarId },
      include: { auctionSlots: true }
    })

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email!,
      userRole: session.user.role!,
      action: 'CREATE_CALENDAR_EVENT',
      entityType: 'auction_calendar',
      entityId: calendarId,
      entityName: description || 'Auction Calendar',
      seasonId,
      details: {
        auctionDate,
        positions,
        slotCount: positions.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(createdCalendar, { status: 201 })
  } catch (error) {
    console.error('Error creating auction calendar:', error)
    return NextResponse.json(
      { error: 'Failed to create auction calendar' },
      { status: 500 }
    )
  }
}
