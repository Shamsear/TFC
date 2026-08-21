import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RetentionWindowsClient from '@/components/admin/RetentionWindowsClient'

export const metadata = {
  title: 'Retention Windows - Admin',
}

interface Props {
  params: Promise<{
    seasonId: string
  }>
}

export default async function RetentionWindowsAdminPage({ params }: Props) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
    redirect('/login')
  }

  const { seasonId } = await params

  // Get season info
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: { id: true, name: true },
  })

  if (!season) {
    redirect('/sub-admin')
  }

  // Get all retention windows for this season
  const windows = await prisma.retention_windows.findMany({
    where: {
      seasonId,
    },
    orderBy: {
      startDate: 'desc',
    },
  })

  // Get all teams participating in this season
  const seasonTeams = await prisma.season_teams.findMany({
    where: {
      seasonId,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      team: {
        name: 'asc',
      },
    },
  })

  const teams = seasonTeams.map((st) => st.team)

  // Find previous season to check manager eligibility
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

  const previousSeasonManagers = previousSeason
    ? await prisma.season_teams.findMany({
        where: { seasonId: previousSeason.id },
        select: { managerName: true },
      })
    : []
  const previousManagerNames = new Set(
    previousSeasonManagers.map((st) => st.managerName).filter(Boolean)
  )

  const ineligibleTeams = seasonTeams
    .filter((st) => !st.managerName || !previousManagerNames.has(st.managerName))
    .map((st) => ({
      teamId: st.team.id,
      teamName: st.team.name,
      teamLogoUrl: st.team.logoUrl || "",
      managerName: st.managerName || "",
    }))

  return (
    <RetentionWindowsClient
      seasonId={seasonId}
      seasonName={season.name}
      windows={windows.map((window) => ({
        ...window,
        startDate: window.startDate.toISOString(),
        endDate: window.endDate.toISOString(),
        createdAt: window.createdAt.toISOString(),
        updatedAt: window.updatedAt.toISOString(),
      }))}
      teams={teams}
      ineligibleTeams={ineligibleTeams}
    />
  )
}
