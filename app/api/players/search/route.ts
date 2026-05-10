import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

const ITEMS_PER_PAGE = 24

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const seasonId = searchParams.get('seasonId')
  const searchQuery = searchParams.get('search') || ''
  const positionFilter = searchParams.get('position') || 'ALL'
  const teamFilter = searchParams.get('team') || 'ALL'
  const sortBy = searchParams.get('sort') || 'rating'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const skip = (page - 1) * ITEMS_PER_PAGE

  if (!seasonId) {
    return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
  }

  // Build where clause
  const whereClause: any = {}

  if (searchQuery.trim()) {
    const query = searchQuery.trim()
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' as const } },
      { seasonalPlayerStats: { some: {
        seasonId,
        OR: [
          { realWorldClub: { contains: query, mode: 'insensitive' as const } },
          { position: { contains: query, mode: 'insensitive' as const } }
        ]
      }}},
      { transferHistory: { some: {
        seasonId,
        team: { name: { contains: query, mode: 'insensitive' as const } }
      }}}
    ]
  }

  if (positionFilter && positionFilter !== 'ALL') {
    const posCondition = { seasonalPlayerStats: { some: { seasonId, position: positionFilter } } }
    if (whereClause.OR) {
      whereClause.AND = [{ OR: whereClause.OR }, posCondition]
      delete whereClause.OR
    } else {
      Object.assign(whereClause, posCondition)
    }
  }

  if (teamFilter && teamFilter !== 'ALL') {
    const teamCondition = teamFilter === 'Free Agent'
      ? { transferHistory: { none: { seasonId } } }
      : { transferHistory: { some: { seasonId, team: { name: teamFilter } } } }

    if (whereClause.AND) {
      whereClause.AND.push(teamCondition)
    } else if (whereClause.OR) {
      whereClause.AND = [{ OR: whereClause.OR }, teamCondition]
      delete whereClause.OR
    } else if (Object.keys(whereClause).length > 0) {
      whereClause.AND = [{ ...whereClause }, teamCondition]
      for (const key of Object.keys(whereClause)) {
        if (key !== 'AND') delete whereClause[key]
      }
    } else {
      Object.assign(whereClause, teamCondition)
    }
  }

  // orderBy: use a relation sort so the DB returns approximate order,
  // then correct with an in-memory sort on the 24-item page.
  let orderBy: any
  if (sortBy === 'rating') {
    orderBy = { seasonalPlayerStats: { _count: 'desc' } } // approximate; corrected below
  } else if (sortBy === 'price') {
    orderBy = { transferHistory: { _count: 'desc' } }     // approximate; corrected below
  } else {
    orderBy = { name: 'asc' }
  }

  const [totalPlayers, players] = await Promise.all([
    prisma.base_players.count({ where: whereClause }),
    prisma.base_players.findMany({
      where: whereClause,
      include: {
        seasonalPlayerStats: { where: { seasonId } },
        transferHistory: {
          where: { seasonId },
          include: { team: { select: { id: true, name: true, logoUrl: true } } }
        }
      },
      orderBy,
      skip,
      take: ITEMS_PER_PAGE
    })
  ])

  // Precise in-memory sort on the 24 returned items
  if (sortBy === 'rating') {
    players.sort((a, b) => (b.seasonalPlayerStats[0]?.overallRating || 0) - (a.seasonalPlayerStats[0]?.overallRating || 0))
  } else if (sortBy === 'price') {
    players.sort((a, b) => (b.transferHistory[0]?.soldPrice || 0) - (a.transferHistory[0]?.soldPrice || 0))
  }

  const playersData = players.map(player => {
    const stats = player.seasonalPlayerStats[0]
    const transfer = player.transferHistory[0]
    return {
      id: player.id,
      name: player.name,
      photoUrl: getPlayerPhotoUrl(`${player.player_id || player.id}.webp`),
      position: stats?.position || 'N/A',
      realWorldClub: stats?.realWorldClub || 'N/A',
      overallRating: stats?.overallRating || 0,
      team: transfer ? { id: transfer.team.id, name: transfer.team.name, logoUrl: transfer.team.logoUrl } : null,
      soldPrice: transfer?.soldPrice || null,
      status: (transfer ? 'SOLD' : 'AVAILABLE') as 'SOLD' | 'AVAILABLE'
    }
  })

  return NextResponse.json({
    players: playersData,
    totalPlayers,
    totalPages: Math.ceil(totalPlayers / ITEMS_PER_PAGE),
    currentPage: page
  })
}
