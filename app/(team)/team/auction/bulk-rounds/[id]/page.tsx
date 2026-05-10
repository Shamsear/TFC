import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import BulkRoundSelectionClient from "@/components/team-auction/BulkRoundSelectionClient"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const metadata = {
  title: "Bulk Round | Team Dashboard",
  description: "Select players for bulk round",
}

async function getBulkRoundData(roundId: string, teamId: string) {
  // Get round details
  const round = await prisma.rounds.findUnique({
    where: { id: roundId },
    include: {
      season: true,
      bulkRoundSelections: {
        where: { teamId },
        include: {
          basePlayer: {
            include: {
              seasonalPlayerStats: {
                where: { seasonId: { not: null } }
              }
            }
          }
        }
      },
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

  if (!round || round.roundType !== 'bulk') {
    return null
  }

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

  // Transform players
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

  // Transform selections
  const selections = round.bulkRoundSelections.map(sel => {
    const stats = sel.basePlayer.seasonalPlayerStats[0]
    return {
      playerId: sel.playerId,
      priority: sel.priority,
      submitted: sel.submitted,
      player: {
        id: sel.basePlayer.id,
        name: sel.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${sel.basePlayer.player_id || sel.basePlayer.id}.webp`),
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
    selections
  }
}

export default async function BulkRoundPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const data = await getBulkRoundData(id, session.user.teamId)

  if (!data) {
    redirect("/team/auction")
  }

  return (
    <BulkRoundSelectionClient
      round={data.round}
      season={data.season}
      team={data.team}
      players={data.players}
      initialSelections={data.selections}
    />
  )
}
