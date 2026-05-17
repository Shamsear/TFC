import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import RoundDetailClient from '@/components/auction/RoundDetailClient'
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

  // Get position group from round if it exists
  const roundPositionGroup = round.position_group || 'ALL'

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
  let previewAllocations = null
  let bulkConflicts: any[] | null = null
  let teamBidsWithDetails: any[] | null = null
  
  if (round.status === 'completed') {
    const rawResults = await prisma.transfer_history.findMany({
      where: {
        seasonId,
        roundId: roundId
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
        position_group: true,
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

    // Fetch and decrypt team bids for completed rounds
    const { decryptBids } = await import('@/lib/auction/encryption')
    
    const teamBidsRaw = await prisma.team_round_bids.findMany({
      where: { roundId },
      include: {
        round: {
          select: {
            basePrice: true
          }
        }
      }
    })

    teamBidsWithDetails = await Promise.all(
      teamBidsRaw.map(async (tb) => {
        const team = seasonTeams.find(st => st.team.id === tb.teamId)
        
        let bids: any[] = []
        try {
          const decrypted = decryptBids(tb.encryptedBids)
          const parsed = JSON.parse(decrypted)
          bids = parsed.bids || []
        } catch (error) {
          console.error(`Failed to decrypt bids for team ${tb.teamId}:`, error)
        }

        // Get player details for each bid
        const bidsWithPlayers = await Promise.all(
          bids.map(async (bid: any) => {
            const player = await prisma.base_players.findUnique({
              where: { id: bid.playerId },
              select: {
                id: true,
                name: true,
                photoUrl: true
              }
            })

            const seasonalStats = await prisma.seasonal_player_stats.findFirst({
              where: {
                seasonId,
                basePlayerId: bid.playerId
              },
              select: {
                position: true,
                position_group: true,
                overallRating: true
              }
            })

            // Check if this bid won
            const wonTransfer = rawResults.find(
              r => r.basePlayerId === bid.playerId && r.teamId === tb.teamId
            )

            return {
              playerId: bid.playerId,
              playerName: player?.name || 'Unknown',
              photoUrl: getPlayerPhotoUrl(player?.photoUrl),
              amount: bid.amount,
              position: seasonalStats?.position || 'Unknown',
              overallRating: seasonalStats?.overallRating || 0,
              won: !!wonTransfer,
              acquisitionType: wonTransfer?.acquisitionType || null,
              acquisitionNotes: wonTransfer?.acquisitionNotes || null
            }
          })
        )

        return {
          teamId: tb.teamId,
          teamName: team?.team.name || 'Unknown',
          teamLogo: team?.team.logoUrl || null,
          submitted: tb.submitted,
          bidCount: tb.bidCount,
          bids: bidsWithPlayers
        }
      })
    )
  } else if (round.status === 'preview_finalized') {
    // Get preview allocations from database table
    const rawPreviewAllocations = await prisma.preview_allocations.findMany({
      where: { roundId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: {
        amount: 'desc'
      }
    })

    previewAllocations = rawPreviewAllocations.map(alloc => ({
      teamId: alloc.teamId,
      basePlayerId: alloc.basePlayerId,
      playerName: alloc.playerName,
      amount: alloc.amount,
      acquisitionType: alloc.acquisitionType,
      acquisitionNotes: alloc.acquisitionNotes,
      team: alloc.team,
      basePlayer: {
        ...alloc.basePlayer,
        photoUrl: getPlayerPhotoUrl(alloc.basePlayer.photoUrl)
      }
    }))
  }

  // Fetch bulk tiebreakers for tiebreaker_pending rounds
  if (round.status === 'tiebreaker_pending' && round.roundType === 'bulk') {
    const tiebreakers = await prisma.bulk_tiebreakers.findMany({
      where: { roundId },
      include: {
        basePlayer: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        participants: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Get seasonal stats for players
    const playerIds = tiebreakers.map(tb => tb.basePlayerId)
    if (playerIds.length > 0) {
      const seasonalStats = await prisma.seasonal_player_stats.findMany({
        where: {
          seasonId,
          basePlayerId: { in: playerIds }
        },
        select: {
          basePlayerId: true,
          position: true,
          position_group: true,
          overallRating: true
        }
      })

      const statsMap = new Map(seasonalStats.map(s => [s.basePlayerId, s]))

      bulkConflicts = tiebreakers.map(tb => ({
        tiebreakerId: tb.id,
        basePlayerId: tb.basePlayerId,
        playerName: tb.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(tb.basePlayer.photoUrl),
        position: statsMap.get(tb.basePlayerId)?.position || 'Unknown',
        overallRating: statsMap.get(tb.basePlayerId)?.overallRating || 0,
        basePrice: tb.basePrice,
        status: tb.status,
        teams: tb.participants.map(p => ({
          id: p.teamId,
          name: p.team.name,
          logoUrl: p.team.logoUrl,
          participantStatus: p.status
        })),
        createdAt: tb.createdAt
      }))
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <RoundDetailClient
          round={round}
          teams={seasonTeams.map(st => st.team)}
          auctionResults={auctionResults}
          previewAllocations={previewAllocations ?? undefined}
          bulkConflicts={bulkConflicts}
          teamBidsWithDetails={teamBidsWithDetails ?? undefined}
        />
      </div>
    </div>
  )
}
