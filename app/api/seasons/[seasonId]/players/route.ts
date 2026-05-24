import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const available = searchParams.get('available') === 'true'

    // Get players who haven't been sold yet (if available filter is true)
    // Only count ACTIVE transfers (not released or transferred out)
    const transferredPlayerIds = available
      ? await prisma.transfer_history.findMany({
          where: { 
            seasonId,
            status: 'ACTIVE'
          },
          select: { basePlayerId: true }
        }).then(results => results.map(t => t.basePlayerId))
      : []

    // Fetch seasonal player stats with limit
    const seasonalStats = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        ...(position && {
          position: position.includes(',')
            ? { in: position.split(',') }
            : position
        }),
        ...(available && transferredPlayerIds.length > 0 && {
          basePlayerId: { notIn: transferredPlayerIds }
        })
      },
      select: {
        basePlayerId: true,
        position: true,
        position_group: true,
        overallRating: true,
        realWorldClub: true,
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true
          }
        }
      },
      orderBy: {
        overallRating: 'desc'
      }
    })

    const players = seasonalStats.map(stat => ({
      id: stat.basePlayer.id,
      name: stat.basePlayer.name,
      photoUrl: getPlayerPhotoUrl(`${stat.basePlayer.player_id || stat.basePlayer.id}.webp`),
      position: stat.position,
      position_group: stat.position_group,
      realWorldClub: stat.realWorldClub,
      overallRating: stat.overallRating
    }))

    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
