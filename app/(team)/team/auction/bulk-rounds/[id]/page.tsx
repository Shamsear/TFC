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
      currentBudget: true,
      football_min_slots: true,
      football_max_slots: true
    }
  })

  if (!seasonTeam) {
    redirect("/team/auction")
  }

  // Get current squad size
  const squadSize = await prisma.transfer_history.count({
    where: {
      teamId: teamId,
      seasonId: round.seasonId
    }
  })

  // Get available players for this round
  const seasonalPlayers = await prisma.seasonal_player_stats.findMany({
    where: {
      seasonId: round.seasonId,
      ...(round.position ? {
        position: round.position.includes(',')
          ? { in: round.position.split(',') }
          : round.position
      } : {}),
      // Filter by position_group if specified (and not 'ALL')
      ...(round.position_group && round.position_group !== 'ALL' ? { position_group: round.position_group } : {}),
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
      position_group: true,
      overallRating: true,
      nationality: true,
      playing_style: true,
      speed: true,
      finishing: true,
      low_pass: true,
      dribbling: true,
      tackling: true,
      physical_contact: true,
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
    playing_style: p.playing_style || null,
    overall: p.overallRating,
    nationality: p.nationality || 'Unknown',
    pace: p.speed || 0,
    shooting: p.finishing || 0,
    passing: p.low_pass || 0,
    dribbling: p.dribbling || 0,
    defending: p.tackling || 0,
    physical: p.physical_contact || 0
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

  // Get season's default min/max squad settings (fallback)
  const auctionSettings = await prisma.auction_settings.findUnique({
    where: { seasonId: round.seasonId }
  })

  const minSquadSize = seasonTeam.football_min_slots || auctionSettings?.min_squad_size || 25
  const maxSquadSize = seasonTeam.football_max_slots || auctionSettings?.max_squad_size || 30

  return (
    <BulkRoundSelectionClient
      round={round}
      season={season}
      team={{ ...team, budget: seasonTeam.currentBudget }}
      players={players}
      initialSelections={initialSelections}
      squadSize={squadSize}
      minSquadSize={minSquadSize}
      maxSquadSize={maxSquadSize}
    />
  )
}
