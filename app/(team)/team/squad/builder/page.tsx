import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import SquadBuilderClient from "@/components/team/SquadBuilderClient"

export const metadata = {
  title: "Squad Builder | Team Dashboard",
  description: "Build your starting XI and substitutes",
}

export default async function SquadBuilderPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason || !seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Active Season</h1>
            <p className="text-gray-400">There is no active season at the moment.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get squad players with their stats
  const transfers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: session.user.teamId,
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
          },
        },
      },
    },
  })

  // Transform data for client component
  const players = transfers.map((transfer) => {
    const stats = transfer.basePlayer.seasonalPlayerStats[0]
    return {
      id: transfer.basePlayer.id,
      playerId: transfer.basePlayer.player_id || transfer.basePlayer.id,
      name: transfer.basePlayer.name,
      position: stats?.position || "Unknown",
      overallRating: stats?.overallRating || 0,
      realWorldClub: stats?.realWorldClub || "Unknown",
      playingStyle: stats?.playing_style || null,
    }
  })

  // Get saved squad formation if exists
  const savedSquad = await prisma.team_squads.findFirst({
    where: {
      team_id: session.user.teamId,
      season_id: activeSeason.id,
    },
  })

  return (
    <SquadBuilderClient
      seasonId={activeSeason.id}
      seasonName={activeSeason.name}
      teamId={session.user.teamId}
      teamName={team?.name || "Your Team"}
      players={players}
      savedSquad={savedSquad?.formation as any}
    />
  )
}
