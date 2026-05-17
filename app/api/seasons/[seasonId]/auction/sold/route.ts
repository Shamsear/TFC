import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params

    // Fetch sold players with limit and minimal data
    const soldPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId: seasonId
      },
      select: {
        id: true,
        soldPrice: true,
        createdAt: true,
        basePlayer: {
          select: {
            id: true,
            name: true,
            player_id: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limit to last 100 sold players
    })

    // Get seasonal stats for these players in a separate query
    const playerIds = soldPlayers.map(p => p.basePlayer.id)
    const seasonalStats = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        basePlayerId: { in: playerIds }
      },
      select: {
        basePlayerId: true,
        position: true,
        position_group: true,
        overallRating: true,
        realWorldClub: true
      }
    })

    const statsMap = new Map(seasonalStats.map(s => [s.basePlayerId, s]))

    // Transform the data
    const formattedPlayers = soldPlayers.map(transfer => {
      const playerStats = statsMap.get(transfer.basePlayer.id)
      
      return {
        id: transfer.id,
        playerName: transfer.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${transfer.basePlayer.player_id || transfer.basePlayer.id}.webp`),
        position: playerStats?.position || 'N/A',
        position_group: playerStats?.position_group || null,
        realWorldClub: playerStats?.realWorldClub || 'N/A',
        overallRating: playerStats?.overallRating || 0,
        teamName: transfer.team.name,
        teamLogoUrl: transfer.team.logoUrl,
        soldPrice: transfer.soldPrice,
        soldDate: transfer.createdAt
      }
    })

    return NextResponse.json(formattedPlayers)
  } catch (error) {
    console.error('Error fetching sold players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sold players' },
      { status: 500 }
    )
  }
}
