import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import RetentionWindowForm from "@/components/admin/RetentionWindowForm"
import { resolveTeamManagerNames } from "@/lib/resolve-manager"

interface Props {
  params: Promise<{ seasonId: string; windowId: string }>
}

export default async function EditRetentionWindowPage({ params }: Props) {
  const session = await auth()
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "SUB_ADMIN")) {
    redirect("/login")
  }

  const { seasonId, windowId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true },
  })

  if (!season) redirect("/sub-admin")

  const window = await prisma.retention_windows.findUnique({
    where: { id: windowId },
  })

  if (!window || window.seasonId !== seasonId) {
    redirect(`/sub-admin/${seasonId}/retention-windows`)
  }

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

  // Resolve current managers
  const teamIds = seasonTeams.map(st => st.team.id)
  const mgrMap = await resolveTeamManagerNames(teamIds, seasonId)

  // Build seasonTeams with eligibility: manager participated in previous season (any team)
  const seasonTeamsWithEligibility = seasonTeams.map(st => {
    const currentManager = mgrMap.get(st.team.id) || st.managerName || ""
    return {
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
      managerName: currentManager,
      hasPreviousSeason: Boolean(currentManager && previousManagerNames.has(currentManager)),
    }
  })

  return (
    <RetentionWindowForm
      seasonId={seasonId}
      seasonName={season.name}
      seasonTeams={seasonTeamsWithEligibility}
      isEdit
      initialData={{
        id: window.id,
        name: window.name,
        startDate: window.startDate.toISOString(),
        endDate: window.endDate.toISOString(),
        retentionLimit: window.retentionLimit,
        bannedTeamIds: window.bannedTeamIds ? JSON.parse(window.bannedTeamIds) : [],
        status: window.status,
      }}
    />
  )
}
