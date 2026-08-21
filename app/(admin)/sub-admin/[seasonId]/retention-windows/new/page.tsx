import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import RetentionWindowForm from "@/components/admin/RetentionWindowForm"

interface Props {
  params: Promise<{ seasonId: string }>
}

export default async function CreateRetentionWindowPage({ params }: Props) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    redirect("/login")
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true },
  })

  if (!season) redirect("/sub-admin")

  const seasonTeams = await prisma.season_teams.findMany({
    where: { seasonId },
    include: { team: { select: { id: true, name: true, logoUrl: true } } },
    orderBy: { team: { name: "asc" } },
  })

  // Find previous season to determine which manager+team combos have no last season
  const seasonData = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { seasonNumber: true },
  })

  const previousSeason = seasonData
    ? await prisma.seasons.findFirst({
        where: { seasonNumber: { lt: seasonData.seasonNumber! } },
        orderBy: { seasonNumber: "desc" },
        select: { id: true },
      })
    : null

  // Get manager names from the previous season (any team)
  const previousSeasonManagers = previousSeason
    ? await prisma.season_teams.findMany({
        where: { seasonId: previousSeason.id },
        select: { managerName: true },
      })
    : []
  const previousManagerNames = new Set(
    previousSeasonManagers.map(st => st.managerName).filter(Boolean)
  )

  // Build seasonTeams with eligibility: manager participated in previous season (any team)
  const seasonTeamsWithEligibility = seasonTeams.map(st => ({
    id: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl,
    managerName: st.managerName || "",
    hasPreviousSeason: Boolean(st.managerName && previousManagerNames.has(st.managerName)),
  }))

  return (
    <RetentionWindowForm
      seasonId={seasonId}
      seasonName={season.name}
      seasonTeams={seasonTeamsWithEligibility}
    />
  )
}
