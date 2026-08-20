import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seasonId = searchParams.get('seasonId')
    const status = searchParams.get('status')

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID required' }, { status: 400 })
    }

    // Build where clause
    const where: any = { seasonId }
    if (status) {
      where.status = status
    }

    // Get all retention requests for this season
    const requests = await prisma.retention_requests.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true,
            photoUrl: true,
          },
        },
        previousSeason: {
          select: {
            id: true,
            name: true,
            seasonNumber: true,
          },
        },
        retentionWindow: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        processor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // pending first
        { submittedAt: 'desc' },
      ],
    })

    // Get retention window info
    const activeWindow = await prisma.retention_windows.findFirst({
      where: {
        seasonId,
        status: 'ACTIVE',
      },
    })

    // Get team statistics
    const teamStats = await prisma.retention_requests.groupBy({
      by: ['teamId', 'status'],
      where: {
        seasonId,
        ...(activeWindow && { retentionWindowId: activeWindow.id }),
      },
      _count: true,
    })

    return NextResponse.json({ 
      requests,
      activeWindow,
      teamStats,
    })
  } catch (error: any) {
    console.error('Error fetching retention requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retention requests' },
      { status: 500 }
    )
  }
}
