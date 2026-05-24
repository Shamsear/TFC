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

  // Get team budgets
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
        />
      </div>
    </div>
  )
}
