import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import RoundDetailClient from '@/components/auction-v2/RoundDetailClient'
import { getPlayerPhotoUrl } from '@/lib/image-cdn'

interface RoundDetailPageProps {
  params: Promise<{ seasonId: string; roundId: string }>
}

export default async function RoundDetailPage({ params }: RoundDetailPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId, roundId } = await params

  // Fetch round with all related data
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    include: {
      season: {
        select: {
          id: true,
          name: true,
          seasonNumber: true
        }
      },
      teamRoundBids: true,
      tiebreakers: {
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: { seasonId },
                take: 1
              }
            }
          },
          teamTiebreakerBids: true
        }
      },
      _count: {
        select: {
          teamRoundBids: true,
          tiebreakers: true
        }
      }
    }
  })

  if (!round) {
    notFound()
  }

  // Fetch teams in this season
  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      }
    }
  })

  // Fetch auction results (transfer history) for completed rounds
  let auctionResults = null
  if (round.status === 'completed') {
    const rawResults = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        // Filter by players that were in this round
        basePlayer: {
          seasonalPlayerStats: {
            some: {
              seasonId,
              position: round.position || undefined
            }
          }
        },
        // Only get transfers created around the round completion time
        createdAt: {
          gte: round.startTime || undefined,
        }
      },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
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
        soldPrice: 'desc'
      }
    })

    // Get seasonal stats for each player
    const playerIds = rawResults.map(r => r.basePlayerId)
    const seasonalStats = await prisma.seasonal_player_stats.findMany({
      where: {
        seasonId,
        basePlayerId: { in: playerIds }
      },
      select: {
        basePlayerId: true,
        position: true,
        overallRating: true,
        nationality: true
      }
    })

    const statsMap = new Map(seasonalStats.map(s => [s.basePlayerId, s]))

    // Transform results to include proper photo URLs and stats
    auctionResults = rawResults.map(result => {
      const stats = statsMap.get(result.basePlayerId)
      return {
        ...result,
        basePlayer: {
          ...result.basePlayer,
          photoUrl: getPlayerPhotoUrl(result.basePlayer.photoUrl),
          seasonalPlayerStats: stats ? [stats] : []
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RoundDetailClient
          round={round}
          teams={seasonTeams.map(st => st.team)}
          auctionResults={auctionResults}
        />
      </div>
    </div>
  )
}
