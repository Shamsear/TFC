import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ReleaseRequestsAdminClient from '@/components/admin/ReleaseRequestsAdminClient'

export const metadata = {
  title: 'Release Requests | Admin Tools',
  description: 'Manage player release requests',
}

export default async function ReleaseRequestsAdminPage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  // Get season
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
  })

  if (!season) {
    redirect('/sub-admin')
  }

  // Get all release windows for this season
  const releaseWindows = await prisma.release_windows.findMany({
    where: { seasonId },
    orderBy: { startDate: 'desc' }
  })

  const serializedReleaseWindows = releaseWindows.map(w => ({
    id: w.id,
    name: w.name,
    startDate: w.startDate.toISOString(),
    endDate: w.endDate.toISOString(),
    status: w.status,
    releaseLimit: w.releaseLimit
  }))

  // Get all release requests for this season
  const requests = await prisma.release_requests.findMany({
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
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
        },
      },
      processor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' }, // pending first
      { submittedAt: 'desc' },
    ],
  })

  // Get ALL teams in this season
  const allSeasonTeams = await prisma.season_teams.findMany({
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

  // Calculate release stats for each team
  const teamStats = allSeasonTeams.map(st => {
    const teamRequests = requests.filter(r => r.teamId === st.teamId)
    const totalRequests = teamRequests.length
    const approvedReleases = teamRequests.filter(r => r.status === 'approved').length
    const pendingRequests = teamRequests.filter(r => r.status === 'pending').length
    const rejectedRequests = teamRequests.filter(r => r.status === 'rejected').length

    return {
      teamId: st.teamId,
      teamName: st.team.name,
      teamLogo: st.team.logoUrl,
      currentBudget: st.currentBudget,
      totalRequests,
      approvedReleases,
      pendingRequests,
      rejectedRequests,
      remainingRequests: 3 - totalRequests,
      remainingApprovals: 3 - approvedReleases,
    }
  })

  // Get team budgets for existing requests
  const teamIds = [...new Set(requests.map(r => r.teamId))]
  const seasonTeams = await prisma.season_teams.findMany({
    where: {
      seasonId,
      teamId: { in: teamIds },
    },
    select: {
      teamId: true,
      currentBudget: true,
    },
  })

  const teamBudgets = Object.fromEntries(
    seasonTeams.map(st => [st.teamId, st.currentBudget])
  )

  // Transform for client
  const transformedRequests = requests.map(req => ({
    id: req.id,
    playerId: req.playerId,
    playerName: req.playerName,
    playerPhotoId: req.basePlayer.player_id || req.basePlayer.id,
    refundAmount: req.refundAmount,
    notes: req.notes,
    status: req.status,
    teamId: req.teamId,
    teamName: req.team.name,
    teamLogo: req.team.logoUrl,
    currentBudget: teamBudgets[req.teamId] || 0,
    newBudget: (teamBudgets[req.teamId] || 0) + req.refundAmount,
    submittedAt: req.submittedAt.toISOString(),
    processedAt: req.processedAt?.toISOString() || null,
    processedBy: req.processor?.name || null,
    rejectionReason: req.rejectionReason,
  }))

  return (
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ReleaseRequestsAdminClient
          seasonId={seasonId}
          seasonName={season.name}
          releaseWindowOpen={season.releaseWindowOpen}
          requests={transformedRequests}
          teamStats={teamStats}
          releaseWindows={serializedReleaseWindows}
        />
      </div>
    </div>
  )
}
