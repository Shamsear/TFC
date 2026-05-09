import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import TeamNavigationClient from "./TeamNavigationClient"

export default async function TeamNavigation() {
  const session = await auth()

  if (!session?.user?.teamId) {
    return null
  }

  // Fetch team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  })

  if (!team) {
    return null
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
    },
  })

  // Check if team is in active season
  const isInActiveSeason = activeSeason
    ? await prisma.season_teams.findUnique({
        where: {
          seasonId_teamId: {
            seasonId: activeSeason.id,
            teamId: team.id,
          },
        },
        select: { id: true },
      })
    : null

  return (
    <TeamNavigationClient
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      team={team}
      activeSeason={activeSeason}
      isInActiveSeason={!!isInActiveSeason}
    />
  )
}
