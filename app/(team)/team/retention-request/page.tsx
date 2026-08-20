import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RetentionRequestClient from '@/components/team/RetentionRequestClient'

export const metadata = {
  title: 'Player Retention',
}

export default async function RetentionRequestPage() {
  const session = await auth()
  if (!session?.user?.teamId) {
    redirect('/login')
  }

  // Get active season
  const activeSeason = await prisma.seasons.findFirst({
    where: { isActive: true },
    select: { id: true, name: true, seasonNumber: true },
  })

  if (!activeSeason) {
    return (
      <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 font-mono">No active season found</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
    select: { id: true, name: true },
  })

  if (!team) {
    redirect('/login')
  }

  // Get season team for budget info
  const seasonTeam = await prisma.season_teams.findUnique({
    where: {
      seasonId_teamId: {
        seasonId: activeSeason.id,
        teamId: team.id,
      },
    },
    select: {
      currentBudget: true,
    },
  })

  if (!seasonTeam) {
    return (
      <div className="min-h-screen bg-[#070708] text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400 font-mono">You are not participating in the current season</p>
          </div>
        </div>
      </div>
    )
  }

  // Check for active retention window
  const activeWindow = await prisma.retention_windows.findFirst({
    where: {
      seasonId: activeSeason.id,
      status: 'ACTIVE',
    },
  })

  // Get previous season
  const previousSeason = await prisma.seasons.findFirst({
    where: {
      seasonNumber: activeSeason.seasonNumber - 1,
    },
    select: { id: true, name: true, seasonNumber: true },
  })

  // Get eligible players from previous season
  let eligiblePlayers: any[] = []
  if (previousSeason) {
    // Verify team participated in previous season
    const previousSeasonTeam = await prisma.season_teams.findFirst({
      where: {
        seasonId: previousSeason.id,
        teamId: team.id,
      },
    })

    if (previousSeasonTeam) {
      // Get players from previous season
      const previousSeasonPlayers = await prisma.transfer_history.findMany({
        where: {
          seasonId: previousSeason.id,
          teamId: team.id,
          status: 'ACTIVE',
        },
        include: {
          basePlayer: {
            select: {
              id: true,
              name: true,
              player_id: true,
              photoUrl: true,
            },
          },
        },
      })

      // Get players already in current season
      const currentSeasonPlayers = await prisma.transfer_history.findMany({
        where: {
          seasonId: activeSeason.id,
          teamId: team.id,
          status: 'ACTIVE',
        },
        select: {
          basePlayerId: true,
        },
      })

      const currentSeasonPlayerIds = new Set(
        currentSeasonPlayers.map((p) => p.basePlayerId)
      )

      // Get pending retention requests
      const pendingRequests = await prisma.retention_requests.findMany({
        where: {
          seasonId: activeSeason.id,
          teamId: team.id,
          status: 'pending',
        },
        select: {
          playerId: true,
        },
      })

      const pendingPlayerIds = new Set(pendingRequests.map((r) => r.playerId))

      // Filter eligible players
      eligiblePlayers = previousSeasonPlayers
        .filter(
          (transfer) =>
            !currentSeasonPlayerIds.has(transfer.basePlayerId) &&
            !pendingPlayerIds.has(transfer.basePlayerId)
        )
        .map((transfer) => ({
          id: transfer.basePlayer.id,
          name: transfer.basePlayer.name,
          player_id: transfer.basePlayer.player_id,
          photoUrl: transfer.basePlayer.photoUrl,
          oldSquadValue: transfer.soldPrice,
          previousSeasonId: previousSeason.id,
          previousSeasonName: previousSeason.name,
        }))
    }
  }

  // Get existing retention requests
  const existingRequests = await prisma.retention_requests.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
    },
    include: {
      basePlayer: {
        select: {
          id: true,
          name: true,
          player_id: true,
        },
      },
      previousSeason: {
        select: {
          id: true,
          name: true,
          seasonNumber: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
  })

  const maxRetentions = activeWindow?.retentionLimit || 3

  // Check if team is banned
  const isBanned = activeWindow?.bannedTeamIds
    ? JSON.parse(activeWindow.bannedTeamIds).includes(team.id)
    : false

  // Count requests in current window
  const totalRequestsCount = await prisma.retention_requests.count({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
      ...(activeWindow && { retentionWindowId: activeWindow.id }),
    },
  })

  const approvedCount = await prisma.retention_requests.count({
    where: {
      seasonId: activeSeason.id,
      teamId: team.id,
      status: 'approved',
      ...(activeWindow && { retentionWindowId: activeWindow.id }),
    },
  })

  return (
    <RetentionRequestClient
      seasonId={activeSeason.id}
      teamId={team.id}
      teamName={team.name}
      seasonName={activeSeason.name}
      currentBudget={seasonTeam.currentBudget}
      eligiblePlayers={eligiblePlayers}
      existingRequests={existingRequests.map((req) => ({
        ...req,
        submittedAt: req.submittedAt?.toISOString() || '',
        processedAt: req.processedAt?.toISOString() || null,
      }))}
      totalRequestsCount={totalRequestsCount}
      approvedCount={approvedCount}
      maxRetentions={maxRetentions}
      remainingRequests={Math.max(0, maxRetentions - totalRequestsCount)}
      remainingApprovals={Math.max(0, maxRetentions - approvedCount)}
      activeWindow={
        activeWindow
          ? {
              id: activeWindow.id,
              name: activeWindow.name,
              startDate: activeWindow.startDate.toISOString(),
              endDate: activeWindow.endDate.toISOString(),
              status: activeWindow.status,
            }
          : null
      }
      isBanned={isBanned}
      previousSeason={previousSeason}
    />
  )
}
