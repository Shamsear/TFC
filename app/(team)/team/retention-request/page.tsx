import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RetentionRequestClient from '@/components/team/RetentionRequestClient'
import { getActiveSeason } from '@/lib/get-active-season'

export const metadata = {
  title: 'Player Retention',
}

export default async function RetentionRequestPage() {
  const session = await auth()
  if (!session?.user?.teamId) {
    redirect('/login')
  }

  // Get active season (reliable: uses TFCS-N ID sorting)
  const activeSeason = await getActiveSeason()

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

  // PARALLELIZE: These queries are independent
  const [seasonTeam, activeWindow, previousSeason] = await Promise.all([
    prisma.season_teams.findUnique({
      where: { seasonId_teamId: { seasonId: activeSeason.id, teamId: team.id } },
      select: { currentBudget: true },
    }),
    prisma.retention_windows.findFirst({
      where: { seasonId: activeSeason.id, status: 'ACTIVE' },
    }),
    prisma.seasons.findFirst({
      where: { seasonNumber: activeSeason.seasonNumber - 1 },
      select: { id: true, name: true, seasonNumber: true },
    }),
  ])

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

  // PARALLELIZE: All remaining queries are independent
  let eligiblePlayers: any[] = []
  let existingRequests: any[] = []
  let totalRequestsCount = 0
  let approvedCount = 0

  const [prevSeasonPlayers, currentSeasonPlayerIds, pendingRequests, existingReqs, reqCount, apprCount] = await Promise.all([
    // Previous season players
    previousSeason
      ? prisma.transfer_history.findMany({
          where: { seasonId: previousSeason.id, teamId: team.id, status: 'ACTIVE' },
          include: {
            basePlayer: {
              select: {
                id: true, name: true, player_id: true, photoUrl: true,
                seasonalPlayerStats: {
                  where: { seasonId: previousSeason.id },
                  select: { position: true, overallRating: true },
                  take: 1,
                },
              },
            },
          },
        })
      : [],
    // Current season player IDs
    prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id, teamId: team.id, status: 'ACTIVE' },
      select: { basePlayerId: true },
    }),
    // Pending retention requests
    prisma.retention_requests.findMany({
      where: { seasonId: activeSeason.id, teamId: team.id, status: 'pending' },
      select: { playerId: true },
    }),
    // Existing retention requests
    prisma.retention_requests.findMany({
      where: { seasonId: activeSeason.id, teamId: team.id },
      include: {
        basePlayer: { select: { id: true, name: true, player_id: true } },
        previousSeason: { select: { id: true, name: true, seasonNumber: true } },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    // Total requests count
    prisma.retention_requests.count({
      where: { seasonId: activeSeason.id, teamId: team.id, ...(activeWindow && { retentionWindowId: activeWindow.id }) },
    }),
    // Approved count
    prisma.retention_requests.count({
      where: { seasonId: activeSeason.id, teamId: team.id, status: 'approved', ...(activeWindow && { retentionWindowId: activeWindow.id }) },
    }),
  ])

  const currentIds = new Set(currentSeasonPlayerIds.map((p) => p.basePlayerId))
  const pendingIds = new Set(pendingRequests.map((r) => r.playerId))
  eligiblePlayers = prevSeasonPlayers
    .filter((t) => !currentIds.has(t.basePlayerId) && !pendingIds.has(t.basePlayerId))
    .map((t) => ({
      id: t.basePlayer.id, name: t.basePlayer.name, player_id: t.basePlayer.player_id,
      photoUrl: t.basePlayer.photoUrl, oldSquadValue: t.soldPrice,
      position: t.basePlayer.seasonalPlayerStats?.[0]?.position || 'Unknown',
      overallRating: t.basePlayer.seasonalPlayerStats?.[0]?.overallRating || 0,
      previousSeasonId: previousSeason!.id, previousSeasonName: previousSeason!.name,
    }))

  existingRequests = existingReqs
  totalRequestsCount = reqCount
  approvedCount = apprCount

  const maxRetentions = activeWindow?.retentionLimit || 3
  const isBanned = activeWindow?.bannedTeamIds ? JSON.parse(activeWindow.bannedTeamIds).includes(team.id) : false

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
