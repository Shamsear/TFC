import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import BulkRoundSelectionClient from "@/components/team-auction/BulkRoundSelectionClient"
import { checkAndFinalizeExpiredRound } from "@/lib/auction/lazy-finalize-round"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export default async function BulkRoundPage({
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
    where: { id }
  })

  if (!round || round.roundType !== 'bulk') {
    redirect("/team/auction")
  }

  // Get active season
  const season = await prisma.seasons.findUnique({
    where: { id: round.seasonId },
    select: {
      id: true,
      name: true
    }
  })

  if (!season) {
    redirect("/team/auction")
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true
    }
  })

  if (!team) {
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

  // Get available players for this round
  const seasonalPlayers = await prisma.seasonal_player_stats.findMany({
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
      nationality: true,
      pace: true,
      shooting: true,
      passing: true,
      dribbling: true,
      defending: true,
      physical: true,
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true
        }
      }
    },
    orderBy: {
      overallRating: 'desc'
    }
  })

  // Transform to expected format
  const players = seasonalPlayers.map(p => ({
    id: p.basePlayerId,
    name: p.basePlayer.name,
    photoUrl: getPlayerPhotoUrl(`${p.basePlayer.player_id || p.basePlayer.id}.webp`),
    position: p.position,
    overall: p.overallRating,
    nationality: p.nationality || 'Unknown',
    pace: p.pace || 0,
    shooting: p.shooting || 0,
    passing: p.passing || 0,
    dribbling: p.dribbling || 0,
    defending: p.defending || 0,
    physical: p.physical || 0
  }))

  // Get existing selections
  const existingSelection = await prisma.bulk_round_selections.findUnique({
    where: {
      roundId_teamId: {
        roundId: id,
        teamId: teamId
      }
    }
  })

  const initialSelections = existingSelection
    ? JSON.parse(existingSelection.selectedPlayers as string).players.map((playerId: string, index: number) => {
        const player = players.find(p => p.id === playerId)
        return {
          playerId,
          priority: index + 1,
          submitted: existingSelection.submitted,
          player: player ? {
            id: player.id,
            name: player.name,
            photoUrl: player.photoUrl,
            position: player.position,
            overall: player.overall
          } : null
        }
      }).filter((s: any) => s.player !== null)
    : []

  return (
    <BulkRoundSelectionClient
      round={round}
      season={season}
      team={{ ...team, budget: seasonTeam.currentBudget }}
      players={players}
      initialSelections={initialSelections}
    />
  )
}
