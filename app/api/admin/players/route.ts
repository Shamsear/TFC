import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const query = searchParams.get('query') || ''
    const duplicatesMode = searchParams.get('duplicates') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50
    const skip = (page - 1) * limit

    if (duplicatesMode) {
      // Find duplicates by grouping by name and nationality
      // First, get all base players with their latest stats to determine nationality
      const allPlayers = await prisma.base_players.findMany({
        where: query ? {
          name: { contains: query, mode: 'insensitive' }
        } : undefined,
        include: {
          seasonalPlayerStats: {
            orderBy: { seasonId: 'desc' },
            take: 1,
            select: {
              nationality: true,
              position: true,
              overallRating: true,
            }
          }
        }
      })

      // Group by name + nationality
      const groups: Record<string, typeof allPlayers> = {}
      allPlayers.forEach(player => {
        const nationality = player.seasonalPlayerStats[0]?.nationality || 'Unknown'
        const key = `${player.name.toLowerCase()}|${nationality.toLowerCase()}`
        if (!groups[key]) groups[key] = []
        groups[key].push(player)
      })

      // Filter to only those with duplicates
      const duplicatePlayers = Object.values(groups)
        .filter(group => group.length > 1)
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name))

      // Paginate
      const paginatedDuplicates = duplicatePlayers.slice(skip, skip + limit)

      return NextResponse.json({
        players: paginatedDuplicates,
        totalCount: duplicatePlayers.length,
        totalPages: Math.ceil(duplicatePlayers.length / limit)
      })
    }

    // Normal mode (paginated search)
    const whereClause = query ? {
      name: { contains: query, mode: 'insensitive' }
    } : {}

    const [players, totalCount] = await Promise.all([
      prisma.base_players.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          seasonalPlayerStats: {
            orderBy: { seasonId: 'desc' },
            take: 1,
            select: {
              nationality: true,
              position: true,
              overallRating: true,
            }
          }
        }
      }),
      prisma.base_players.count({ where: whereClause })
    ])

    return NextResponse.json({
      players,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const playerId = searchParams.get('id')

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 })
    }

    // Delete the player (will cascade to seasonal_player_stats, transfer_history, etc.)
    await prisma.base_players.delete({
      where: { id: playerId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}
