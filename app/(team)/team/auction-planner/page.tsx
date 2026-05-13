import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AuctionPlannerClient from "@/components/team/AuctionPlannerClient"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const metadata = {
  title: "Auction Planner | Turf Cats",
  description: "Plan your auction strategy and budget allocation",
}

export default async function AuctionPlannerPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
  })

  if (!activeSeason) {
    redirect("/team/not-in-season")
  }

  // Get team's season data
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
    include: {
      team: true,
    },
  })

  if (!seasonTeam) {
    redirect("/team/not-in-season")
  }

  // Get all available players for the season
  const players = await prisma.seasonal_player_stats.findMany({
    where: {
      seasonId: activeSeason.id,
    },
    include: {
      basePlayer: true,
    },
    orderBy: [
      { position: 'asc' },
      { overallRating: 'desc' },
    ],
  })

  // Get current squad
  const currentSquad = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: session.user.teamId,
    },
    select: {
      basePlayerId: true,
    },
  })

  const currentSquadPlayerIds = currentSquad.map(t => t.basePlayerId)

  // Filter out already owned players
  const availablePlayers = players.filter(
    p => !currentSquadPlayerIds.includes(p.basePlayerId)
  )

  // Get starred players
  const starredPlayers = await prisma.starred_players.findMany({
    where: {
      seasonTeamId: seasonTeam.id,
      seasonId: activeSeason.id,
    },
    select: {
      playerId: true,
    },
  })

  const starredPlayerIds = starredPlayers.map(sp => sp.playerId)

  return (
    <AuctionPlannerClient
      seasonId={activeSeason.id}
      seasonName={activeSeason.name}
      teamId={session.user.teamId}
      teamName={seasonTeam.team.name}
      currentBudget={seasonTeam.currentBudget}
      startingPurse={activeSeason.startingPurse}
      players={availablePlayers.map(p => ({
        id: p.basePlayer.id,
        name: p.basePlayer.name,
        position: p.position,
        positionGroup: p.position_group,
        overallRating: p.overallRating,
        realWorldClub: p.realWorldClub,
        photoUrl: getPlayerPhotoUrl(`${p.basePlayer.player_id || p.basePlayer.id}.webp`),
        playingStyle: p.playing_style,
      }))}
      initialStarredPlayerIds={starredPlayerIds}
    />
  )
}
