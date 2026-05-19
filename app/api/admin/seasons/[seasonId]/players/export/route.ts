import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth()
    if (!session || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { seasonId } = await params
    const { searchParams } = new URL(request.url)
    const isSoldFilter = searchParams.get('is_sold') // 'all', 'sold', 'unsold'

    // Fetch all players for this season
    const seasonalStats = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
      },
      include: {
        basePlayer: {
          include: {
            transferHistory: {
              where: { seasonId },
              include: {
                team: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        overallRating: 'desc'
      }
    })

    // Map and filter stats
    const mapped = seasonalStats.map(stat => {
      const transfer = stat.basePlayer.transferHistory[0]
      return {
        id: stat.basePlayer.id,
        player_id: stat.basePlayer.player_id,
        name: stat.basePlayer.name,
        position: stat.position,
        position_group: stat.position_group,
        overallRating: stat.overallRating,
        age: stat.age,
        nationality: stat.nationality,
        realWorldClub: stat.realWorldClub,
        playing_style: stat.playing_style,
        teamName: transfer ? transfer.team.name : null,
        isSold: !!transfer,
        soldPrice: transfer ? transfer.soldPrice : null,
        
        // Offensive Stats
        ball_control: stat.ball_control,
        dribbling: stat.dribbling,
        tight_possession: stat.tight_possession,
        low_pass: stat.low_pass,
        lofted_pass: stat.lofted_pass,
        finishing: stat.finishing,
        heading: stat.heading,
        set_piece_taking: stat.set_piece_taking,
        curl: stat.curl,
        offensive_awareness: stat.offensive_awareness,

        // Physical Stats
        speed: stat.speed,
        acceleration: stat.acceleration,
        kicking_power: stat.kicking_power,
        jumping: stat.jumping,
        physical_contact: stat.physical_contact,
        balance: stat.balance,
        stamina: stat.stamina,

        // Defensive Stats
        tackling: stat.tackling,
        aggression: stat.aggression,
        defensive_engagement: stat.defensive_engagement,
        defensive_awareness: stat.defensive_awareness,

        // Goalkeeping Stats
        gk_awareness: stat.gk_awareness,
        gk_catching: stat.gk_catching,
        gk_parrying: stat.gk_parrying,
        gk_reflexes: stat.gk_reflexes,
        gk_reach: stat.gk_reach,
      }
    })

    let filtered = mapped
    if (isSoldFilter === 'sold') {
      filtered = mapped.filter(p => p.isSold)
    } else if (isSoldFilter === 'unsold') {
      filtered = mapped.filter(p => !p.isSold)
    }

    return NextResponse.json({ players: filtered })
  } catch (error) {
    console.error('Error exporting players database:', error)
    return NextResponse.json({ error: 'Failed to retrieve player list for export' }, { status: 500 })
  }
}
