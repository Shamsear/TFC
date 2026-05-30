import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
import { normalizeString } from '@/lib/search-utils'

const ITEMS_PER_PAGE = 24

export async function GET(request: NextRequest) {
  const session = await auth()

  const { searchParams } = request.nextUrl
  const seasonId = searchParams.get('seasonId')
  const searchQuery = searchParams.get('search') || ''
  const positionFilter = searchParams.get('position') || 'ALL'
  const positionsParam = searchParams.get('positions') // comma-separated list for position groups
  const teamFilter = searchParams.get('team') || 'ALL'
  const groupFilter = searchParams.get('group') || 'ALL'
  const playingStyleFilter = searchParams.get('playingStyle') || 'all'
  const sortBy = searchParams.get('sort') || 'rating'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const skip = (page - 1) * ITEMS_PER_PAGE

  // Parse positions parameter if provided (for position groups)
  const positionsList = positionsParam ? positionsParam.split(',').map(p => p.trim()).filter(Boolean) : null

  if (!seasonId) {
    return NextResponse.json({ error: 'seasonId is required' }, { status: 400 })
  }

  // ── Build shared filter helpers ─────────────────────────────────────────────
  const q = searchQuery.trim()
  const normalizedQuery = normalizeString(q)

  // Filter conditions expressed as constraints on base_players
  // Used when querying from base_players (name sort)
  const basePLayerWhere: any = {}
  if (q) {
    basePLayerWhere.OR = [
      { name: { contains: q, mode: 'insensitive' as const } },
      { normalized_name: { contains: normalizedQuery, mode: 'insensitive' as const } },
      { seasonalPlayerStats: { some: { seasonId, OR: [
        { realWorldClub: { contains: q, mode: 'insensitive' as const } },
        { position: { contains: q, mode: 'insensitive' as const } }
      ]}}},
      { transferHistory: { some: { seasonId, status: 'ACTIVE', team: { name: { contains: q, mode: 'insensitive' as const } } }}}
    ]
  }
  if (positionsList && positionsList.length > 0) {
    // Handle multiple positions (position groups)
    const statsFilter: any = { seasonId, position: { in: positionsList } }
    const posCond = { seasonalPlayerStats: { some: statsFilter } }
    if (basePLayerWhere.OR) {
      basePLayerWhere.AND = [{ OR: basePLayerWhere.OR }, posCond]
      delete basePLayerWhere.OR
    } else {
      Object.assign(basePLayerWhere, posCond)
    }
  } else if (positionFilter !== 'ALL') {
    const statsFilter: any = { seasonId, position: positionFilter }
    // Add group filter if specified and position supports groups
    if (groupFilter !== 'ALL' && ['CB', 'DMF', 'CMF', 'AMF', 'CF'].includes(positionFilter)) {
      statsFilter.position_group = groupFilter
    }
    const posCond = { seasonalPlayerStats: { some: statsFilter } }
    if (basePLayerWhere.OR) {
      basePLayerWhere.AND = [{ OR: basePLayerWhere.OR }, posCond]
      delete basePLayerWhere.OR
    } else {
      Object.assign(basePLayerWhere, posCond)
    }
  }
  if (playingStyleFilter !== 'all') {
    const styleCond = { seasonalPlayerStats: { some: { seasonId, playing_style: playingStyleFilter } } }
    if (basePLayerWhere.AND) {
      basePLayerWhere.AND.push(styleCond)
    } else if (basePLayerWhere.OR) {
      basePLayerWhere.AND = [{ OR: basePLayerWhere.OR }, styleCond]
      delete basePLayerWhere.OR
    } else if (Object.keys(basePLayerWhere).length > 0) {
      basePLayerWhere.AND = [{ ...basePLayerWhere }, styleCond]
      for (const k of Object.keys(basePLayerWhere)) { if (k !== 'AND') delete basePLayerWhere[k] }
    } else {
      Object.assign(basePLayerWhere, styleCond)
    }
  }
  if (teamFilter !== 'ALL') {
    const teamCond = teamFilter === 'Free Agent'
      ? { transferHistory: { none: { seasonId, status: 'ACTIVE' } } }
      : { transferHistory: { some: { seasonId, status: 'ACTIVE', team: { name: teamFilter } } } }
    if (basePLayerWhere.AND) {
      basePLayerWhere.AND.push(teamCond)
    } else if (basePLayerWhere.OR) {
      basePLayerWhere.AND = [{ OR: basePLayerWhere.OR }, teamCond]
      delete basePLayerWhere.OR
    } else if (Object.keys(basePLayerWhere).length > 0) {
      basePLayerWhere.AND = [{ ...basePLayerWhere }, teamCond]
      for (const k of Object.keys(basePLayerWhere)) { if (k !== 'AND') delete basePLayerWhere[k] }
    } else {
      Object.assign(basePLayerWhere, teamCond)
    }
  }

  // ── Sort by RATING — query from seasonal_player_stats for correct DB-level ordering ──
  if (sortBy === 'rating') {
    // Build the stats-level where (position filter goes directly here)
    const statsWhere: any = { seasonId }

    if (q) {
      statsWhere.OR = [
        { realWorldClub: { contains: q, mode: 'insensitive' as const } },
        { position: { contains: q, mode: 'insensitive' as const } },
        { basePlayer: { name: { contains: q, mode: 'insensitive' as const } } },
        { basePlayer: { normalized_name: { contains: normalizedQuery, mode: 'insensitive' as const } } },
        { basePlayer: { transferHistory: { some: { seasonId, status: 'ACTIVE', team: { name: { contains: q, mode: 'insensitive' as const } } } } } }
      ]
    }
    if (positionsList && positionsList.length > 0) {
      // Handle multiple positions (position groups)
      const posCondition: any = { position: { in: positionsList } }
      if (statsWhere.OR) {
        statsWhere.AND = [{ OR: statsWhere.OR }, posCondition]
        delete statsWhere.OR
      } else {
        Object.assign(statsWhere, posCondition)
      }
    } else if (positionFilter !== 'ALL') {
      const posCondition: any = { position: positionFilter }
      // Add group filter if specified and position supports groups
      if (groupFilter !== 'ALL' && ['CB', 'DMF', 'CMF', 'AMF', 'CF'].includes(positionFilter)) {
        posCondition.position_group = groupFilter
      }
      if (statsWhere.OR) {
        statsWhere.AND = [{ OR: statsWhere.OR }, posCondition]
        delete statsWhere.OR
      } else {
        Object.assign(statsWhere, posCondition)
      }
    }
    if (playingStyleFilter !== 'all') {
      const styleCond = { playing_style: playingStyleFilter }
      if (statsWhere.AND) {
        statsWhere.AND.push(styleCond)
      } else if (statsWhere.OR) {
        statsWhere.AND = [{ OR: statsWhere.OR }, styleCond]
        delete statsWhere.OR
      } else {
        Object.assign(statsWhere, styleCond)
      }
    }
    if (teamFilter !== 'ALL') {
      const teamCond = teamFilter === 'Free Agent'
        ? { basePlayer: { transferHistory: { none: { seasonId, status: 'ACTIVE' } } } }
        : { basePlayer: { transferHistory: { some: { seasonId, status: 'ACTIVE', team: { name: teamFilter } } } } }
      if (statsWhere.AND) {
        statsWhere.AND.push(teamCond)
      } else if (statsWhere.OR) {
        statsWhere.AND = [{ OR: statsWhere.OR }, teamCond]
        delete statsWhere.OR
      } else {
        Object.assign(statsWhere, teamCond)
      }
    }

    const [totalPlayers, statsResults] = await Promise.all([
      prisma.seasonal_player_stats.count({ where: statsWhere }),
      prisma.seasonal_player_stats.findMany({
        where: statsWhere,
        orderBy: { overallRating: 'desc' }, // ← real DB-level sort
        skip,
        take: ITEMS_PER_PAGE,
        include: {
          basePlayer: {
            include: {
              transferHistory: {
                where: { seasonId, status: 'ACTIVE' },
                include: { team: { select: { id: true, name: true, logoUrl: true } } }
              }
            }
          }
        }
      })
    ])

    const players = statsResults.map(stats => {
      const player = stats.basePlayer
      const transfer = player.transferHistory[0]
      return {
        id: player.id,
        name: player.name,
        photoUrl: getPlayerPhotoUrl(`${player.player_id || player.id}.webp`),
        position: stats.position || 'N/A',
        realWorldClub: stats.realWorldClub || 'N/A',
        overallRating: stats.overallRating || 0,
        team: transfer ? { id: transfer.team.id, name: transfer.team.name, logoUrl: transfer.team.logoUrl } : null,
        soldPrice: transfer?.soldPrice || null,
        status: (transfer ? 'SOLD' : 'AVAILABLE') as 'SOLD' | 'AVAILABLE',
        position_group: stats.position_group || null,
        playingStyle: stats.playing_style || null
      }
    })

    return NextResponse.json({
      players,
      totalPlayers,
      totalPages: Math.ceil(totalPlayers / ITEMS_PER_PAGE),
      currentPage: page
    })
  }

  // ── Sort by PRICE — query from transfer_history for correct DB-level ordering ──
  if (sortBy === 'price') {
    const transferWhere: any = { 
      seasonId,
      status: 'ACTIVE'  // Only show active transfers
    }
    if (q) {
      transferWhere.OR = [
        { basePlayer: { name: { contains: q, mode: 'insensitive' as const } } },
        { basePlayer: { normalized_name: { contains: normalizedQuery, mode: 'insensitive' as const } } },
        { basePlayer: { seasonalPlayerStats: { some: { seasonId, OR: [
          { realWorldClub: { contains: q, mode: 'insensitive' as const } },
          { position: { contains: q, mode: 'insensitive' as const } }
        ]}}}},
        { team: { name: { contains: q, mode: 'insensitive' as const } } }
      ]
    }
    if (positionsList && positionsList.length > 0) {
      // Handle multiple positions (position groups)
      const statsFilter: any = { seasonId, position: { in: positionsList } }
      const posCond = { basePlayer: { seasonalPlayerStats: { some: statsFilter } } }
      if (transferWhere.OR) {
        transferWhere.AND = [{ OR: transferWhere.OR }, posCond]; delete transferWhere.OR
      } else { Object.assign(transferWhere, posCond) }
    } else if (positionFilter !== 'ALL') {
      const statsFilter: any = { seasonId, position: positionFilter }
      // Add group filter if specified and position supports groups
      if (groupFilter !== 'ALL' && ['CB', 'DMF', 'CMF', 'AMF', 'CF'].includes(positionFilter)) {
        statsFilter.position_group = groupFilter
      }
      const posCond = { basePlayer: { seasonalPlayerStats: { some: statsFilter } } }
      if (transferWhere.OR) {
        transferWhere.AND = [{ OR: transferWhere.OR }, posCond]; delete transferWhere.OR
      } else { Object.assign(transferWhere, posCond) }
    }
    if (playingStyleFilter !== 'all') {
      const styleCond = { basePlayer: { seasonalPlayerStats: { some: { seasonId, playing_style: playingStyleFilter } } } }
      if (transferWhere.AND) transferWhere.AND.push(styleCond)
      else if (transferWhere.OR) { transferWhere.AND = [{ OR: transferWhere.OR }, styleCond]; delete transferWhere.OR }
      else Object.assign(transferWhere, styleCond)
    }
    if (teamFilter === 'Free Agent') {
      // Free agents have no transfer history — return empty for price sort
      return NextResponse.json({ players: [], totalPlayers: 0, totalPages: 0, currentPage: page })
    } else if (teamFilter !== 'ALL') {
      const tCond = { team: { name: teamFilter } }
      if (transferWhere.AND) transferWhere.AND.push(tCond)
      else if (transferWhere.OR) { transferWhere.AND = [{ OR: transferWhere.OR }, tCond]; delete transferWhere.OR }
      else Object.assign(transferWhere, tCond)
    }

    const [totalPlayers, transferResults] = await Promise.all([
      prisma.transfer_history.count({ where: transferWhere }),
      prisma.transfer_history.findMany({
        where: transferWhere,
        orderBy: { soldPrice: 'desc' }, // ← real DB-level sort
        skip,
        take: ITEMS_PER_PAGE,
        include: {
          team: { select: { id: true, name: true, logoUrl: true } },
          basePlayer: {
            include: { seasonalPlayerStats: { where: { seasonId } } }
          }
        }
      })
    ])

    const players = transferResults.map(transfer => {
      const player = transfer.basePlayer
      const stats = player.seasonalPlayerStats[0]
      return {
        id: player.id,
        name: player.name,
        photoUrl: getPlayerPhotoUrl(`${player.player_id || player.id}.webp`),
        position: stats?.position || 'N/A',
        realWorldClub: stats?.realWorldClub || 'N/A',
        overallRating: stats?.overallRating || 0,
        team: { id: transfer.team.id, name: transfer.team.name, logoUrl: transfer.team.logoUrl },
        soldPrice: transfer.soldPrice,
        status: 'SOLD' as const,
        position_group: stats?.position_group || null,
        playingStyle: stats?.playing_style || null
      }
    })

    return NextResponse.json({
      players,
      totalPlayers,
      totalPages: Math.ceil(totalPlayers / ITEMS_PER_PAGE),
      currentPage: page
    })
  }

  // ── Default: Sort by NAME — query from base_players ─────────────────────────
  const [totalPlayers, basePlayers] = await Promise.all([
    prisma.base_players.count({ where: basePLayerWhere }),
    prisma.base_players.findMany({
      where: basePLayerWhere,
      include: {
        seasonalPlayerStats: { where: { seasonId } },
        transferHistory: {
          where: { seasonId, status: 'ACTIVE' },
          include: { team: { select: { id: true, name: true, logoUrl: true } } }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: ITEMS_PER_PAGE
    })
  ])

  const players = basePlayers.map(player => {
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
      status: (transfer ? 'SOLD' : 'AVAILABLE') as 'SOLD' | 'AVAILABLE',
      position_group: stats?.position_group || null,
      playingStyle: stats?.playing_style || null
    }
  })

  return NextResponse.json({
    players,
    totalPlayers,
    totalPages: Math.ceil(totalPlayers / ITEMS_PER_PAGE),
    currentPage: page
  })
}
