import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const { seasonId } = await params

    // Fetch all sold players for this season with player and team details
    const soldPlayers = await prisma.transfer_history.findMany({
      where: {
        seasonId: seasonId
      },
      include: {
        basePlayer: {
          include: {
            seasonalPlayerStats: {
              where: {
                seasonId: seasonId
              }
            }
          }
        },
        team: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the SoldPlayer interface
    const formattedPlayers = soldPlayers.map(transfer => {
      const playerStats = transfer.basePlayer.seasonalPlayerStats[0]
      
      return {
        id: transfer.id,
        playerName: transfer.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${transfer.basePlayer.player_id || transfer.basePlayer.id}.webp`),
        position: playerStats?.position || 'N/A',
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
