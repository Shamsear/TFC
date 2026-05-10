import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import RoundBiddingClient from "@/components/team-auction/RoundBiddingClient"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const metadata = {
  title: "Round Bidding | Team Dashboard",
  description: "Place your bids for this auction round",
}

async function getRoundData(roundId: string, teamId: string) {
  // Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    include: {
      season: true,
      availablePlayers: {
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: { seasonId: { not: null } }
              }
            }
          }
        }
      }
    }
  })

  if (!round) {
    return null
  }

  // Get team's bids for this round
  const teamBids = await prisma.team_round_bids.findMany({
    where: {
      roundId,
      teamId
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: { seasonId: round.seasonId }
          }
        }
      }
    }
  })

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      budget: true
    }
  })

  // Transform players with their stats
  const players = round.availablePlayers.map(ap => {
    const stats = ap.basePlayer.seasonalPlayerStats[0]
    return {
      id: ap.basePlayer.id,
      name: ap.basePlayer.name,
      photoUrl: getPlayerPhotoUrl(`${ap.basePlayer.player_id || ap.basePlayer.id}.webp`),
      position: stats?.position || 'Unknown',
      overall: stats?.overallRating || 0,
      nationality: stats?.nationality || 'Unknown',
      pace: stats?.pace || 0,
      shooting: stats?.shooting || 0,
      passing: stats?.passing || 0,
      dribbling: stats?.dribbling || 0,
      defending: stats?.defending || 0,
      physical: stats?.physical || 0
    }
  })

  // Transform bids
  const bids = teamBids.map(bid => {
    const stats = bid.basePlayer.seasonalPlayerStats[0]
    return {
      playerId: bid.playerId,
      bidAmount: bid.bidAmount,
      submitted: bid.submitted,
      player: {
        id: bid.basePlayer.id,
        name: bid.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${bid.basePlayer.player_id || bid.basePlayer.id}.webp`),
        position: stats?.position || 'Unknown',
        overall: stats?.overallRating || 0
      }
    }
  })

  return {
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      position: round.position,
      roundType: round.roundType,
      status: round.status,
      startTime: round.startTime,
      endTime: round.endTime,
      maxBidsPerTeam: round.maxBidsPerTeam,
      basePrice: round.basePrice,
      seasonId: round.seasonId
    },
    season: {
      id: round.season.id,
      name: round.season.name
    },
    team: team!,
    players,
    bids
  }
}

export default async function RoundBiddingPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const data = await getRoundData(id, session.user.teamId)

  if (!data) {
    redirect("/team/auction")
  }

  return (
    <RoundBiddingClient
      round={data.round}
      season={data.season}
      team={data.team}
      players={data.players}
      initialBids={data.bids}
    />
  )
}
