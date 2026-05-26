import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import ReleaseRequestClient from "@/components/team/ReleaseRequestClient"

export const metadata = {
  title: "Release Request | Team Dashboard",
  description: "Submit player release requests",
}

export default async function ReleaseRequestPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason || !seasonTeam) {
    redirect("/team/not-in-season")
  }

  // Check if an active release window exists
  const activeReleaseWindow = await prisma.release_windows.findFirst({
    where: {
      seasonId: activeSeason.id,
      status: 'ACTIVE',
    }
  })

  if (!activeReleaseWindow) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Release Request
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-black text-white mb-2">Release Window Closed</h2>
            <p className="text-gray-400">The release request window is currently closed. Please check back later.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get squad players with status ACTIVE
  const transfers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: session.user.teamId,
      status: 'ACTIVE',
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
            select: {
              position: true,
              position_group: true,
              overallRating: true,
              realWorldClub: true,
              playing_style: true,
            },
          },
        },
      },
    },
    orderBy: {
      soldPrice: "desc",
    },
  })

  // Get existing release requests for this team (all statuses)
  const allRequests = await prisma.release_requests.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: session.user.teamId,
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
  })

  // Separate pending requests for the UI
  const existingRequests = allRequests.filter(req => req.status === 'pending')

  // Count total requests (all statuses)
  const totalRequestsCount = allRequests.length

  // Count approved releases for this team in this season
  const approvedReleasesCount = allRequests.filter(req => req.status === 'approved').length

  const MAX_RELEASES_PER_TEAM = activeReleaseWindow.releaseLimit || 3
  const remainingRequests = Math.max(0, MAX_RELEASES_PER_TEAM - totalRequestsCount)
  const remainingApprovals = Math.max(0, MAX_RELEASES_PER_TEAM - approvedReleasesCount)

  // Transform data for client
  const players = transfers.map(transfer => {
    const stats = transfer.basePlayer.seasonalPlayerStats[0]
    return {
      id: transfer.basePlayer.id,
      name: transfer.basePlayer.name,
      playerId: transfer.basePlayer.player_id,
      position: stats?.position || 'Unknown',
      positionGroup: stats?.position_group || null,
      overall: stats?.overallRating || 0,
      club: stats?.realWorldClub || 'Unknown',
      playingStyle: stats?.playing_style || null,
      soldPrice: transfer.soldPrice,
    }
  })

  const requests = existingRequests.map(req => ({
    id: req.id,
    playerId: req.playerId,
    playerName: req.playerName,
    refundAmount: req.refundAmount,
    notes: req.notes,
    status: req.status,
    submittedAt: req.submittedAt.toISOString(),
  }))

  // Also get all requests for display
  const allRequestsForDisplay = allRequests.map(req => ({
    id: req.id,
    playerId: req.playerId,
    playerName: req.playerName,
    refundAmount: req.refundAmount,
    notes: req.notes,
    status: req.status,
    submittedAt: req.submittedAt.toISOString(),
    processedAt: req.processedAt?.toISOString() || null,
    rejectionReason: req.rejectionReason,
  }))

  return (
    <ReleaseRequestClient
      seasonId={activeSeason.id}
      releaseWindowId={activeReleaseWindow.id}
      teamId={session.user.teamId!}
      teamName={team?.name || ''}
      currentBudget={seasonTeam.currentBudget}
      currentSlots={players.length}
      maxSlots={seasonTeam.football_max_slots || 30}
      players={players}
      existingRequests={requests}
      allRequests={allRequestsForDisplay}
      totalRequestsCount={totalRequestsCount}
      approvedReleasesCount={approvedReleasesCount}
      maxReleases={MAX_RELEASES_PER_TEAM}
      remainingRequests={remainingRequests}
      remainingApprovals={remainingApprovals}
    />
  )
}
