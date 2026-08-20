import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Get all retention windows for this season
    const windows = await prisma.retention_windows.findMany({
      where: { seasonId },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ windows })
  } catch (error: any) {
    console.error('Error fetching retention windows:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retention windows' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId, name, startDate, endDate, retentionLimit, bannedTeamIds } = body

    if (!seasonId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 })
    }

    // Check for overlapping windows
    const overlapping = await prisma.retention_windows.findFirst({
      where: {
        seasonId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'This window overlaps with an existing retention window' },
        { status: 400 }
      )
    }

    // Determine status based on current time
    const now = new Date()
    let status = 'UPCOMING'
    if (now >= start && now <= end) {
      status = 'ACTIVE'
    } else if (now > end) {
      status = 'CLOSED'
    }

    // Create window
    const window = await prisma.retention_windows.create({
      data: {
        id: randomUUID(),
        seasonId,
        name,
        startDate: start,
        endDate: end,
        status,
        retentionLimit: retentionLimit || 3,
        bannedTeamIds: bannedTeamIds ? JSON.stringify(bannedTeamIds) : null,
      },
    })

    return NextResponse.json({ success: true, window })
  } catch (error: any) {
    console.error('Error creating retention window:', error)
    return NextResponse.json(
      { error: 'Failed to create retention window' },
      { status: 500 }
    )
  }
}
