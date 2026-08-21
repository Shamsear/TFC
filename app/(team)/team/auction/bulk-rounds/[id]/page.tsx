import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import BulkRoundSelectionClient from "@/components/team-auction/BulkRoundSelectionClient"
import { checkAndFinalizeExpiredRound } from "@/lib/auction/lazy-finalize-round"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const dynamic = "force-dynamic"

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

  // PARALLELIZE: All these queries depend on round but not each other
  const [season, team, seasonTeam, squadSize, seasonalPlayers, existingSelection, auctionSettings] = await Promise.all([
    // Season
    prisma.seasons.findUnique({ where: { id: round.seasonId }, select: { id: true, name: true } }),
    // Team
    prisma.teams.findUnique({ where: { id: teamId }, select: { id: true, name: true, logoUrl: true } }),
    // Season team
    prisma.season_teams.findUnique({
      where: { seasonId_teamId: { seasonId: round.seasonId, teamId } },
      select: { id: true, currentBudget: true, football_min_slots: true, football_max_slots: true }
    }),
    // Squad size
    prisma.transfer_history.count({ where: { teamId, seasonId: round.seasonId, status: 'ACTIVE' } }),
    // Available players
    prisma.seasonal_player_stats.findMany({
      where: {
        seasonId: round.seasonId,
        ...(round.position ? { position: round.position.includes(',') ? { in: round.position.split(',') } : round.position } : {}),
        ...(round.position_group && round.position_group !== 'ALL' ? { position_group: round.position_group } : {}),
        basePlayer: { transferHistory: { none: { seasonId: round.seasonId, status: 'ACTIVE' } } }
      },
      select: {
        basePlayerId: true, position: true, position_group: true, overallRating: true,
        nationality: true, playing_style: true, speed: true, finishing: true,
        low_pass: true, dribbling: true, tackling: true, physical_contact: true,
        basePlayer: { select: { id: true, name: true, player_id: true } }
      },
      orderBy: { overallRating: 'desc' }
    }),
    // Existing selections
    prisma.bulk_round_selections.findUnique({
      where: { roundId_teamId: { roundId: id, teamId } }
    }),
    // Auction settings
    prisma.auction_settings.findUnique({ where: { seasonId: round.seasonId } }),
  ])

  if (!season || !team || !seasonTeam) redirect("/team/auction")

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
