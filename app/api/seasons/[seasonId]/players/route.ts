import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position')
    const available = searchParams.get('available') === 'true'

    // Get players who haven't been sold yet
    const transferredPlayerIds = available
      ? await prisma.transfer_history.findMany({
          where: { seasonId },
          select: { basePlayerId: true }
        })
      : []

    const transferredIds = new Set(transferredPlayerIds.map(t => t.basePlayerId))

    // Fetch seasonal player stats
    const seasonalStats = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        ...(position && { position })
      },
      include: {
        basePlayer: true
      },
      orderBy: {
        overallRating: 'desc'
      }
    })

    // Filter out sold players if available=true
    const players = seasonalStats
      .filter(stat => !available || !transferredIds.has(stat.basePlayerId))
      .map(stat => ({
        id: stat.basePlayer.id,
        name: stat.basePlayer.name,
        photoUrl: stat.basePlayer.photoUrl,
        position: stat.position,
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
