import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NormalRoundBiddingClient from "@/components/team-auction/NormalRoundBiddingClient"
import { checkAndFinalizeExpiredRound } from "@/lib/auction/lazy-finalize-round"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import { decryptBids } from "@/lib/auction/encryption"

export default async function RoundBiddingPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const teamId = session.user.teamId

  // Quick check: only run lazy finalization if round might be expired
  // This avoids the expensive finalization check on every page load
  const quickRoundCheck = await prisma.rounds.findUnique({
    where: { id },
    select: { 
      status: true, 
      endTime: true,
      finalizationMode: true 
    }
  })

  // Only run finalization check if round is active and past end time
  if (quickRoundCheck?.status === 'active' && quickRoundCheck.endTime) {
    const now = new Date()
    if (now > quickRoundCheck.endTime) {
      // Round is expired, run finalization check
      await checkAndFinalizeExpiredRound(id)
    }
  }

  // Fetch round details
  const round = await prisma.rounds.findUnique({
    where: { id },
    include: {
      season: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  if (!round) {
    redirect("/team/auction")
  }

  // If this is a bulk round, redirect to bulk round page
  if (round.roundType === 'bulk') {
    redirect(`/team/auction/bulk-rounds/${id}`)
  }

  // If round is completed, redirect to results
  if (round.status === 'completed') {
    redirect(`/team/auction/rounds/${id}/results`)
  }

  // If round has tiebreakers pending, redirect to tiebreaker page
  if (round.status === 'tiebreaker_pending') {
    // Check if there's an active tiebreaker for this team
    const activeTiebreaker = await prisma.tiebreakers.findFirst({
      where: {
        roundId: id,
        status: 'active',
        teamTiebreakerBids: {
          some: {
            teamId: teamId
          }
        }
      },
      select: {
        id: true
      }
    })

    if (activeTiebreaker) {
      redirect(`/team/auction/tiebreakers/${activeTiebreaker.id}`)
    }
  }

  // If round is finalizing, show loading/wait state
  // (will be handled by client component)

  // Check if team is in season
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: round.seasonId,
        teamId: teamId
      }
    },
    select: {
      id: true,
      currentBudget: true,
      team: {
        select: {
          name: true
        }
      }
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Run queries in parallel for better performance
  const [squadSize, ownedPlayerIds] = await Promise.all([
    // Get squad size (only ACTIVE players)
    prisma.transfer_history.count({
      where: {
        teamId: teamId,
        seasonId: round.seasonId,
        status: 'ACTIVE'
      }
    }),
    
    // Get already owned player IDs (only for this season to reduce data)
    prisma.transfer_history.findMany({
      where: {
        seasonId: round.seasonId
      },
      select: {
        basePlayerId: true
      }
    }).then(results => results.map(p => p.basePlayerId))
  ])

  // Get available players for this round with limit
  const players = await prisma.seasonal_player_stats.findMany({
    where: {
      seasonId: round.seasonId,
      ...(round.position ? {
        position: round.position.includes(',')
          ? { in: round.position.split(',').map(p => p.trim()) }
          : round.position
      } : {}),
      ...(round.position_group && round.position_group !== 'ALL' ? { position_group: round.position_group } : {}),
      basePlayerId: {
        notIn: ownedPlayerIds
      }
    },
    select: {
      basePlayerId: true,
      position: true,
      position_group: true,
      overallRating: true,
      playing_style: true,
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          player_id: true
        }
      }
    },
    orderBy: {
      overallRating: 'desc'
    }
  })

  // Get existing bids
  const existingBidsRaw = await prisma.team_round_bids.findUnique({
    where: {
      roundId_teamId: {
        roundId: id,
        teamId: teamId
      }
    },
    select: {
      encryptedBids: true,
      submitted: true,
      bidCount: true,
      lastUpdated: true
    }
  })

  // Decrypt bids on server side
  let existingBids = null
  if (existingBidsRaw) {
    try {
      const decrypted = decryptBids(existingBidsRaw.encryptedBids)
      const parsed = JSON.parse(decrypted)
      const bidMap: Record<string, number> = {}
      parsed.bids.forEach((bid: any) => {
        bidMap[bid.base_player_id] = bid.amount
      })
      existingBids = {
        bids: bidMap,
        submitted: existingBidsRaw.submitted,
        bidCount: existingBidsRaw.bidCount,
        lastUpdated: existingBidsRaw.lastUpdated
      }
    } catch (error) {
      console.error('Failed to decrypt bids on server:', error)
      // If decryption fails, start fresh
      existingBids = {
        bids: {},
        submitted: false,
        bidCount: 0,
        lastUpdated: new Date()
      }
    }
  }

  // Transform players with proper photo URLs
  const transformedPlayers = players.map(p => ({
    ...p,
    basePlayer: {
      ...p.basePlayer,
      photoUrl: getPlayerPhotoUrl(`${p.basePlayer.player_id || p.basePlayer.id}.webp`)
    }
  }))

  return (
    <NormalRoundBiddingClient
      round={round}
      players={transformedPlayers}
      budget={seasonTeam.currentBudget}
      squadSize={squadSize}
      existingBids={existingBids}
      teamId={teamId}
      teamName={seasonTeam.team.name}
    />
  )
}
