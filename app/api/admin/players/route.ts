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
    
    // Check if this is a request for clubs list
    if (searchParams.get('getClubs') === 'true') {
      const clubs = await prisma.seasonal_player_stats.findMany({
        where: {
          realWorldClub: { 
            not: ''
          }
        },
        select: {
          realWorldClub: true
        },
        distinct: ['realWorldClub'],
        orderBy: {
          realWorldClub: 'asc'
        }
      })
      
      return NextResponse.json({
        clubs: clubs.map(c => c.realWorldClub).filter(c => c && c.trim() !== '')
      })
    }

    const query = searchParams.get('query') || ''
    const duplicatesMode = searchParams.get('duplicates') === 'true'
    const positionFilter = searchParams.get('position') || 'all'
    const clubFilter = searchParams.get('club') || 'all'
    
    // Handle multiple sort fields
    const sortConfigs: Array<{ field: string; direction: string }> = []
    const sortField1 = searchParams.get('sortField') || 'name'
    const sortDirection1 = searchParams.get('sortDirection') || 'asc'
    sortConfigs.push({ field: sortField1, direction: sortDirection1 })
    
    // Check for additional sort fields (sortField2, sortField3, etc.)
    for (let i = 2; i <= 5; i++) {
      const field = searchParams.get(`sortField${i}`)
      const direction = searchParams.get(`sortDirection${i}`)
      if (field && direction) {
        sortConfigs.push({ field, direction })
      }
    }
    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 50
    const skip = (page - 1) * limit

    if (duplicatesMode) {
      // Find duplicates by grouping by name and nationality
      // First, get ALL base players with their latest stats to determine nationality
      const allPlayers = await prisma.base_players.findMany({
        include: {
          seasonalPlayerStats: {
            orderBy: { seasonId: 'desc' },
            take: 1,
            select: {
              nationality: true,
              position: true,
              overallRating: true,
              realWorldClub: true,
              playing_style: true,
            }
          },
          transferHistory: {
            select: {
              id: true
            },
            take: 1
          }
        }
      })

      // Group all players by name + nationality
      const groups: Record<string, typeof allPlayers> = {}
      allPlayers.forEach(player => {
        const nationality = player.seasonalPlayerStats[0]?.nationality || 'Unknown'
        const key = `${player.name.toLowerCase()}|${nationality.toLowerCase()}`
        if (!groups[key]) groups[key] = []
        groups[key].push(player)
      })

      // Filter to only those with duplicates globally
      let duplicateGroups = Object.values(groups).filter(group => group.length > 1)

      // If there's a query, only keep groups where at least one player matches the query
      if (query) {
        const lowerQuery = query.toLowerCase()
        duplicateGroups = duplicateGroups.filter(group => 
          group.some(player => 
            player.name.toLowerCase().includes(lowerQuery) || 
            (player.seasonalPlayerStats[0]?.realWorldClub?.toLowerCase().includes(lowerQuery))
          )
        )
      }

      // If there's a position filter, only keep groups where at least one player matches the position
      if (positionFilter !== 'all') {
        duplicateGroups = duplicateGroups.filter(group => 
          group.some(player => player.seasonalPlayerStats[0]?.position === positionFilter)
        )
      }

      // If there's a club filter, only keep groups where at least one player matches the club
      if (clubFilter !== 'all') {
        duplicateGroups = duplicateGroups.filter(group => 
          group.some(player => player.seasonalPlayerStats[0]?.realWorldClub === clubFilter)
        )
      }

      const duplicatePlayers = duplicateGroups
        .flat()

      // Multi-level sort for duplicate players
      duplicatePlayers.sort((a, b) => {
        for (const sortConfig of sortConfigs) {
          const statsA = a.seasonalPlayerStats[0]
          const statsB = b.seasonalPlayerStats[0]
          let compareValue = 0

          switch (sortConfig.field) {
            case 'name':
              compareValue = a.name.localeCompare(b.name)
              break
            case 'nationality':
              compareValue = (statsA?.nationality || '').localeCompare(statsB?.nationality || '')
              break
            case 'club':
              compareValue = (statsA?.realWorldClub || '').localeCompare(statsB?.realWorldClub || '')
              break
            case 'position':
              compareValue = (statsA?.position || '').localeCompare(statsB?.position || '')
              break
            case 'rating':
              compareValue = (statsA?.overallRating || 0) - (statsB?.overallRating || 0)
              break
            case 'playingStyle':
              compareValue = (statsA?.playing_style || '').localeCompare(statsB?.playing_style || '')
              break
          }

          if (compareValue !== 0) {
            return sortConfig.direction === 'asc' ? compareValue : -compareValue
          }
        }
        return 0
      })

      // Paginate
      const paginatedDuplicates = duplicatePlayers.slice(skip, skip + limit)

      return NextResponse.json({
        players: paginatedDuplicates,
        totalCount: duplicatePlayers.length,
        totalPages: Math.ceil(duplicatePlayers.length / limit)
      })
    }

    // Normal mode (paginated search)
    const whereClause: any = {
      AND: []
    }

    if (query) {
      whereClause.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { seasonalPlayerStats: { some: { realWorldClub: { contains: query, mode: 'insensitive' as const } } } }
        ]
      })
    }

    if (positionFilter !== 'all') {
      whereClause.AND.push({
        seasonalPlayerStats: { some: { position: positionFilter } }
      })
    }

    if (clubFilter !== 'all') {
      whereClause.AND.push({
        seasonalPlayerStats: { some: { realWorldClub: clubFilter } }
      })
    }

    // If no filters, remove the AND clause
    const finalWhereClause = whereClause.AND.length > 0 ? whereClause : {}

    // Build orderBy clause based on primary sortField (only name can be sorted in DB)
    const primarySort = sortConfigs[0]
    let orderByClause: any = primarySort.field === 'name' 
      ? { name: primarySort.direction } 
      : { name: 'asc' } // Fallback to name for other fields

    const [allPlayers, totalCount] = await Promise.all([
      prisma.base_players.findMany({
        where: finalWhereClause,
        orderBy: orderByClause,
        include: {
          seasonalPlayerStats: {
            orderBy: { seasonId: 'desc' },
            take: 1,
            select: {
              nationality: true,
              position: true,
              overallRating: true,
              realWorldClub: true,
              playing_style: true,
            }
          },
          transferHistory: {
            select: {
              id: true
            },
            take: 1
          }
        }
      }),
      prisma.base_players.count({ where: finalWhereClause })
    ])

    // Multi-level sort in memory for all fields
    allPlayers.sort((a, b) => {
      for (const sortConfig of sortConfigs) {
        const statsA = a.seasonalPlayerStats[0]
        const statsB = b.seasonalPlayerStats[0]
        let compareValue = 0

        switch (sortConfig.field) {
          case 'name':
            compareValue = a.name.localeCompare(b.name)
            break
          case 'nationality':
            compareValue = (statsA?.nationality || '').localeCompare(statsB?.nationality || '')
            break
          case 'club':
            compareValue = (statsA?.realWorldClub || '').localeCompare(statsB?.realWorldClub || '')
            break
          case 'position':
            compareValue = (statsA?.position || '').localeCompare(statsB?.position || '')
            break
          case 'rating':
            compareValue = (statsA?.overallRating || 0) - (statsB?.overallRating || 0)
            break
          case 'playingStyle':
            compareValue = (statsA?.playing_style || '').localeCompare(statsB?.playing_style || '')
            break
        }

        if (compareValue !== 0) {
          return sortConfig.direction === 'asc' ? compareValue : -compareValue
        }
      }
      return 0
    })

    // Paginate after sorting
    const players = allPlayers.slice(skip, skip + limit)

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

    let playerIds: string[] = []

    // Try parsing from body
    try {
      const body = await request.json()
      if (body.playerIds && Array.isArray(body.playerIds)) {
        playerIds = body.playerIds
      }
    } catch (e) {
      // Fallback to query param
      const { searchParams } = request.nextUrl
      const playerId = searchParams.get('id')
      if (playerId) playerIds = [playerId]
    }

    if (playerIds.length === 0) {
      // If body parsing failed and no query param, try query param directly just in case
      const { searchParams } = request.nextUrl
      const playerId = searchParams.get('id')
      if (playerId) playerIds = [playerId]
    }

    if (playerIds.length === 0) {
      return NextResponse.json({ error: 'Player IDs required' }, { status: 400 })
    }

    // Delete the players (will cascade to seasonal_player_stats, transfer_history, etc.)
    await prisma.base_players.deleteMany({
      where: { id: { in: playerIds } }
    })

    return NextResponse.json({ success: true, deletedCount: playerIds.length })
  } catch (error) {
    console.error('Error deleting players:', error)
    return NextResponse.json({ error: 'Failed to delete players' }, { status: 500 })
  }
}
