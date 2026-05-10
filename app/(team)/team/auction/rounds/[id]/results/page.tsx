import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import RoundResultsClient from "@/components/team-auction/RoundResultsClient"

export default async function RoundResultsPage({
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
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Get all allocations for this round
  const allocations = await prisma.transfer_history.findMany({
    where: {
      seasonId: round.seasonId,
      createdAt: {
        gte: round.startTime,
        lte: round.endTime || new Date()
      }
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true
        }
      },
      team: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      soldPrice: 'desc'
    }
  })

  // Check for tiebreakers involving this team
  const tiebreakers = await prisma.bulk_tiebreakers.findMany({
    where: {
      roundId: id,
      tiedTeams: {
        has: teamId
      },
      resolved: false
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true
        }
      }
    }
  })

  // Transform allocations with proper photo URLs
  const transformedAllocations = allocations.map(a => ({
    ...a,
    basePlayer: {
      ...a.basePlayer,
      photoUrl: getPlayerPhotoUrl(`${a.basePlayer.player_id || a.basePlayer.id}.webp`)
    }
  }))

  // Transform tiebreakers with proper photo URLs
  const transformedTiebreakers = tiebreakers.map(t => ({
    ...t,
    basePlayer: {
      ...t.basePlayer,
      photoUrl: getPlayerPhotoUrl(`${t.basePlayer.player_id || t.basePlayer.id}.webp`)
    }
  }))

  return (
    <RoundResultsClient
      round={round}
      allocations={transformedAllocations}
      tiebreakers={transformedTiebreakers}
      teamId={teamId}
    />
  )
}
