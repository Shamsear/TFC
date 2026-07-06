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

  // Fetch round with all related data in parallel
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
      bulkRoundSelections: true,
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
          tiebreakers: true,
          bulkRoundSelections: true
        }
      }
    }
  })

  if (!round) {
    notFound()
  }

  // Fetch season teams and team active squad sizes in parallel
  const [seasonTeams, teamSquadSizesData] = await Promise.all([
    prisma.season_teams.findMany({
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
    }),
    prisma.transfer_history.groupBy({
      by: ['teamId'],
      where: {
        seasonId,
        status: 'ACTIVE'
      },
      _count: { _all: true }
    })
  ])
  
  const squadSizeMap = new Map(teamSquadSizesData.map(s => [s.teamId, s._count._all]))

  // Fetch auction results (transfer history) and details for completed rounds
  let auctionResults = null
  let previewAllocations = null
  let bulkConflicts: any[] | null = null
  let teamBidsWithDetails: any[] | null = null
  let bulkSelectionsWithDetails: any[] | null = null
  
  if (round.status === 'completed') {
    // Determine round type and load round data concurrently
    if (round.roundType !== 'bulk') {
      const [rawResults, teamBidsRaw] = await Promise.all([
        prisma.transfer_history.findMany({
          where: { seasonId, roundId },
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
        }),
        prisma.team_round_bids.findMany({
          where: { roundId },
          include: {
            round: {
              select: {
                basePrice: true
              }
            }
          }
        })
      ])

      // Get seasonal stats for each player in parallel
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
      
      // Collect all bids and unique player IDs
      const allDecryptedBids = new Map<string, any[]>()
      const allBidPlayerIds = new Set<string>()

      for (const teamBid of teamBidsRaw) {
        try {
          const decrypted = decryptBids(teamBid.encryptedBids)
          const parsed = JSON.parse(decrypted)
          const bids = parsed.bids || []
          allDecryptedBids.set(teamBid.teamId, bids)
          
          bids.forEach((bid: any) => {
            const playerId = bid.base_player_id || bid.playerId
            if (playerId) {
              allBidPlayerIds.add(playerId)
            }
          })
        } catch (error) {
          console.error(`Failed to decrypt bids for team ${teamBid.teamId}:`, error)
          allDecryptedBids.set(teamBid.teamId, [])
        }
      }

      // Fetch all required player details in bulk concurrently
      const playerIdsArray = Array.from(allBidPlayerIds)
      const [bidPlayers, bidSeasonalStats] = await Promise.all([
        prisma.base_players.findMany({
          where: { id: { in: playerIdsArray } },
          select: { id: true, name: true, photoUrl: true }
        }),
        prisma.seasonal_player_stats.findMany({
          where: { seasonId, basePlayerId: { in: playerIdsArray } },
          select: { basePlayerId: true, position: true, position_group: true, overallRating: true }
        })
      ])

      const bidPlayerMap = new Map(bidPlayers.map(p => [p.id, p]))
      const bidStatsMap = new Map(bidSeasonalStats.map(s => [s.basePlayerId, s]))

      // Create won transfers lookup
      const wonTransferMap = new Map<string, any>()
      rawResults.forEach(r => {
        wonTransferMap.set(`${r.teamId}_${r.basePlayerId}`, r)
      })

      // Construct the final details synchronously
      teamBidsWithDetails = seasonTeams.map((st) => {
        const team = st.team
        const bids = allDecryptedBids.get(team.id) || []
        const teamBid = teamBidsRaw.find(tb => tb.teamId === team.id)
        const teamBidPlayerIds = new Set(bids.map((b: any) => b.base_player_id || b.playerId))
        
        const bidsWithPlayers = bids.map((bid: any) => {
          const playerId = bid.base_player_id || bid.playerId
          
          if (!playerId) {
            return {
              playerId: '',
              playerName: bid.player_name || 'Unknown',
              photoUrl: getPlayerPhotoUrl(null),
              amount: bid?.amount || 0,
              position: 'Unknown',
              overallRating: 0,
              won: false,
              acquisitionType: null,
              acquisitionNotes: null
            }
          }

          const player = bidPlayerMap.get(playerId)
          const seasonalStats = bidStatsMap.get(playerId)
          const wonTransfer = wonTransferMap.get(`${team.id}_${playerId}`)

          return {
            playerId: playerId,
            playerName: player?.name || bid.player_name || 'Unknown',
            photoUrl: getPlayerPhotoUrl(player?.photoUrl),
            amount: bid.amount || 0,
            position: seasonalStats?.position || 'Unknown',
            overallRating: seasonalStats?.overallRating || 0,
            won: !!wonTransfer,
            acquisitionType: wonTransfer?.acquisitionType || null,
            acquisitionNotes: wonTransfer?.acquisitionNotes || null
          }
        })

        // Check if team got any auto-allocated players
        const autoAllocatedPlayers = rawResults.filter(
          r => r.teamId === team.id && 
               r.acquisitionType === 'auto_assigned' &&
               !teamBidPlayerIds.has(r.basePlayerId)
        ).map(r => {
          const stats = statsMap.get(r.basePlayerId)
          return {
            playerId: r.basePlayerId,
            playerName: r.basePlayer.name,
            photoUrl: getPlayerPhotoUrl(r.basePlayer.photoUrl),
            amount: r.soldPrice || 0,
            position: stats?.position || 'Unknown',
            overallRating: stats?.overallRating || 0,
            won: true,
            acquisitionType: r.acquisitionType,
            acquisitionNotes: r.acquisitionNotes
          }
        })

        return {
          teamId: team.id,
          teamName: team.name,
          teamLogo: team.logoUrl,
          submitted: teamBid?.submitted || false,
          bidCount: teamBid?.bidCount || 0,
          bids: [...bidsWithPlayers, ...autoAllocatedPlayers].sort((a, b) => b.amount - a.amount),
          totalSpent: bidsWithPlayers.reduce((sum: number, b: any) => b.won ? sum + b.amount : sum, 0) +
                     autoAllocatedPlayers.reduce((sum: number, p: any) => sum + p.amount, 0)
        }
      })
    } else {
      // Fetch bulk selections and tiebreakers concurrently
      const [rawResults, bulkSelections, bulkTiebreakers] = await Promise.all([
        prisma.transfer_history.findMany({
          where: { seasonId, roundId },
          include: {
            basePlayer: {
              select: { id: true, name: true, photoUrl: true, player_id: true }
            },
            team: {
              select: { id: true, name: true, logoUrl: true }
            }
          },
          orderBy: { soldPrice: 'desc' }
        }),
        prisma.bulk_round_selections.findMany({
          where: { roundId },
          select: { teamId: true, selectedPlayers: true, submitted: true }
        }),
        prisma.bulk_tiebreakers.findMany({
          where: { roundId },
          include: {
            participants: {
              select: { teamId: true, newBidAmount: true, currentBid: true }
            }
          }
        })
      ])

      // Get seasonal stats for raw results
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

      // Create a map of playerId -> teamId -> highest bid amount
      const tiebreakerBidsMap = new Map<string, Map<string, number>>()
      for (const tb of bulkTiebreakers) {
        const teamBidsForPlayer = new Map<string, number>()
        for (const participant of tb.participants) {
          const bidAmount = participant.newBidAmount || participant.currentBid || 0
          teamBidsForPlayer.set(participant.teamId, bidAmount)
        }
        tiebreakerBidsMap.set(tb.basePlayerId, teamBidsForPlayer)
      }

      // Collect all selected player IDs
      const allSelectedPlayerIds = new Set<string>()
      for (const selection of bulkSelections) {
        try {
          const parsed = JSON.parse(selection.selectedPlayers as string)
          parsed.players.forEach((playerId: string) => allSelectedPlayerIds.add(playerId))
        } catch (e) {}
      }

      // Fetch player details for selections concurrently
      const [selectedPlayers, selectedSeasonalStats] = await Promise.all([
        prisma.base_players.findMany({
          where: { id: { in: Array.from(allSelectedPlayerIds) } },
          select: { id: true, name: true, photoUrl: true }
        }),
        prisma.seasonal_player_stats.findMany({
          where: { seasonId, basePlayerId: { in: Array.from(allSelectedPlayerIds) } },
          select: { basePlayerId: true, position: true, position_group: true, overallRating: true }
        })
      ])

      const selectionPlayerMap = new Map(selectedPlayers.map(p => [p.id, p]))
      const selectionStatsMap = new Map(selectedSeasonalStats.map(s => [s.basePlayerId, s]))

      // Build teamBidsWithDetails
      teamBidsWithDetails = seasonTeams.map(st => {
        const team = st.team
        const selection = bulkSelections.find(s => s.teamId === team.id)
        const teamAllocations = rawResults.filter(r => r.teamId === team.id)
        const wonPlayerIds = new Set(teamAllocations.map(a => a.basePlayerId))

        let allBids: any[] = []
        
        if (selection) {
          try {
            const parsed = JSON.parse(selection.selectedPlayers as string)
            allBids = parsed.players.map((playerId: string, index: number) => {
              const player = selectionPlayerMap.get(playerId)
              const stats = selectionStatsMap.get(playerId)
              const won = wonPlayerIds.has(playerId)
              const allocation = teamAllocations.find(a => a.basePlayerId === playerId)
              
              let amount = 0
              if (won && allocation) {
                amount = allocation.soldPrice || 0
              } else {
                const tiebreakerBids = tiebreakerBidsMap.get(playerId)
                if (tiebreakerBids) {
                  amount = tiebreakerBids.get(team.id) || 0
                }
              }
              
              return {
                playerId,
                playerName: player?.name || 'Unknown',
                photoUrl: getPlayerPhotoUrl(player?.photoUrl),
                amount,
                position: stats?.position || 'Unknown',
                overallRating: stats?.overallRating || 0,
                won,
                acquisitionType: allocation?.acquisitionType || null,
                acquisitionNotes: allocation?.acquisitionNotes || null,
                priority: index + 1
              }
            })
          } catch (e) {
            console.error(`Failed to parse selections for team ${team.id}:`, e)
          }
        }

        const totalSpent = allBids.filter(b => b.won).reduce((sum, b) => sum + b.amount, 0)

        return {
          teamId: team.id,
          teamName: team.name,
          teamLogo: team.logoUrl,
          submitted: selection?.submitted || false,
          bidCount: allBids.length,
          bids: allBids,
          totalSpent
        }
      })

      // Build team selections with details
      bulkSelectionsWithDetails = seasonTeams.map(st => {
        const team = st.team
        const selection = bulkSelections.find(s => s.teamId === team.id)
        
        if (!selection) {
          return {
            teamId: team.id,
            teamName: team.name,
            teamLogo: team.logoUrl,
            submitted: false,
            selections: []
          }
        }

        let selections: any[] = []
        try {
          const parsed = JSON.parse(selection.selectedPlayers as string)
          selections = parsed.players.map((playerId: string, index: number) => {
            const player = selectionPlayerMap.get(playerId)
            const stats = selectionStatsMap.get(playerId)
            
            return {
              playerId,
              playerName: player?.name || 'Unknown',
              photoUrl: getPlayerPhotoUrl(player?.photoUrl),
              position: stats?.position || 'Unknown',
              overallRating: stats?.overallRating || 0,
              priority: index + 1
            }
          })
        } catch (e) {
          console.error(`Failed to parse selections for team ${team.id}:`, e)
        }

        return {
          teamId: team.id,
          teamName: team.name,
          teamLogo: team.logoUrl,
          submitted: selection.submitted,
          selections
        }
      })
    }
  } else if (round.status === 'preview_finalized') {
    const rawPreviewAllocations = await prisma.preview_allocations.findMany({
      where: { roundId },
      include: {
        team: {
          select: { id: true, name: true, logoUrl: true }
        },
        basePlayer: {
          select: { id: true, name: true, photoUrl: true }
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
          select: { id: true, name: true, photoUrl: true }
        },
        participants: {
          include: {
            team: {
              select: { id: true, name: true, logoUrl: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

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

  // Fetch bulk selections with details for bulk rounds in tiebreaker_pending or expired_pending_finalization
  if (round.roundType === 'bulk' && (round.status === 'tiebreaker_pending' || round.status === 'expired_pending_finalization')) {
    const bulkSelections = await prisma.bulk_round_selections.findMany({
      where: { roundId },
      select: {
        teamId: true,
        selectedPlayers: true,
        submitted: true
      }
    })

    const allSelectedPlayerIds = new Set<string>()
    for (const selection of bulkSelections) {
      try {
        const parsed = JSON.parse(selection.selectedPlayers as string)
        parsed.players.forEach((playerId: string) => allSelectedPlayerIds.add(playerId))
      } catch (e) {}
    }

    const [selectedPlayers, selectedSeasonalStats] = await Promise.all([
      prisma.base_players.findMany({
        where: { id: { in: Array.from(allSelectedPlayerIds) } },
        select: { id: true, name: true, photoUrl: true }
      }),
      prisma.seasonal_player_stats.findMany({
        where: { seasonId, basePlayerId: { in: Array.from(allSelectedPlayerIds) } },
        select: { basePlayerId: true, position: true, position_group: true, overallRating: true }
      })
    ])

    const playerMap = new Map(selectedPlayers.map(p => [p.id, p]))
    const statsMap = new Map(selectedSeasonalStats.map(s => [s.basePlayerId, s]))

    bulkSelectionsWithDetails = seasonTeams.map(st => {
      const team = st.team
      const selection = bulkSelections.find(s => s.teamId === team.id)
      
      if (!selection) {
        return {
          teamId: team.id,
          teamName: team.name,
          teamLogo: team.logoUrl,
          submitted: false,
          selections: []
        }
      }

      let selections: any[] = []
      try {
        const parsed = JSON.parse(selection.selectedPlayers as string)
        selections = parsed.players.map((playerId: string, index: number) => {
          const player = playerMap.get(playerId)
          const stats = statsMap.get(playerId)
          
          return {
            playerId,
            playerName: player?.name || 'Unknown',
            photoUrl: getPlayerPhotoUrl(player?.photoUrl),
            position: stats?.position || 'Unknown',
            overallRating: stats?.overallRating || 0,
            priority: index + 1
          }
        })
      } catch (e) {
        console.error(`Failed to parse selections for team ${team.id}:`, e)
      }

      return {
        teamId: team.id,
        teamName: team.name,
        teamLogo: team.logoUrl,
        submitted: selection.submitted,
        selections
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      <RoundDetailClient
        round={round}
        teams={seasonTeams.map(st => st.team)}
        auctionResults={auctionResults}
        previewAllocations={previewAllocations ?? undefined}
        bulkConflicts={bulkConflicts}
        teamBidsWithDetails={teamBidsWithDetails ?? undefined}
        bulkSelectionsWithDetails={bulkSelectionsWithDetails ?? undefined}
        teamSquadSizes={Object.fromEntries(squadSizeMap)}
      />
    </div>
  )
}
