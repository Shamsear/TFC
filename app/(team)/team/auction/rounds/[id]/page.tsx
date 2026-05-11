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

  // Check and finalize if expired (lazy finalization)
  await checkAndFinalizeExpiredRound(id)

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
      currentBudget: true
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Get squad size
  const squadSize = await prisma.transfer_history.count({
    where: {
      teamId: teamId,
      seasonId: round.seasonId
    }
  })

  // Get available players for this round
  const players = await prisma.seasonal_player_stats.findMany({
    where: {
      seasonId: round.seasonId,
      ...(round.position ? { position: round.position } : {}),
      // Exclude already owned players
      basePlayer: {
        transferHistory: {
          none: {
            seasonId: round.seasonId
          }
        }
      }
    },
    select: {
      basePlayerId: true,
      position: true,
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
    />
  )
}
