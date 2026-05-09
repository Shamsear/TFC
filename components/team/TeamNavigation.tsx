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
      managerName: true
    }
  })

  // Fetch active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
    select: { id: true, name: true }
  })

  return (
    <TeamNavigationClient
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      team={team}
      activeSeason={activeSeason}
    />
  )
}
