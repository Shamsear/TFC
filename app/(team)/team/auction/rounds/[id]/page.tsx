import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import NormalRoundBiddingClient from "@/components/team-auction/NormalRoundBiddingClient"
import { checkAndFinalizeExpiredRound } from "@/lib/lazy-finalize-round"

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
      basePlayer: {
        select: {
          id: true,
          name: true,
          photoUrl: true
        }
      }
    },
    orderBy: {
      overallRating: 'desc'
    }
  })

  // Get existing bids
  const existingBids = await prisma.team_round_bids.findUnique({
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

  return (
    <NormalRoundBiddingClient
      round={round}
      players={players}
      budget={seasonTeam.currentBudget}
      squadSize={squadSize}
      existingBids={existingBids}
      teamId={teamId}
    />
  )
}
