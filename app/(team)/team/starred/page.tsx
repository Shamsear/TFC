import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import StarredPlayersClient from "@/components/team/StarredPlayersClient"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const metadata = {
  title: "Starred Players | Team Dashboard",
  description: "View and manage your starred players",
}

export default async function StarredPlayersPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason) {
    redirect("/team/not-in-season")
  }

  // Get season team
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: session.user.teamId,
      },
    },
  })

  if (!seasonTeam) {
    redirect("/team/not-in-season")
  }

  // Get starred players
  const starredPlayers = await prisma.starred_players.findMany({
    where: {
      seasonTeamId: seasonTeam.id,
      seasonId: activeSeason.id,
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

  // Get ALL sold players in this season
  const allSoldPlayers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
    },
    select: {
      basePlayerId: true,
    },
  })

  const allSoldPlayerIds = allSoldPlayers.map(t => t.basePlayerId)

  // Transform starred players data
  const players = starredPlayers
    .filter(sp => !allSoldPlayerIds.includes(sp.playerId)) // Exclude all already sold players
    .map(sp => {
      const stats = sp.basePlayer.seasonalPlayerStats[0]
      return {
        id: sp.basePlayer.id,
        name: sp.basePlayer.name,
        position: stats?.position || 'N/A',
        positionGroup: stats?.position_group || null,
        overallRating: stats?.overallRating || 0,
        realWorldClub: stats?.realWorldClub || 'Unknown',
        photoUrl: getPlayerPhotoUrl(`${sp.basePlayer.player_id || sp.basePlayer.id}.webp`),
        playingStyle: stats?.playing_style || null,
      }
    })

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <StarredPlayersClient
            seasonId={activeSeason.id}
            seasonName={activeSeason.name}
            teamId={session.user.teamId}
            players={players}
          />
        </div>
      </main>
    </div>
  )
}
