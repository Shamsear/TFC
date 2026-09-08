import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import SwapRequestClient from "@/components/team/SwapRequestClient"

export const metadata = {
  title: "Swap Request | Team Dashboard",
  description: "Submit player swap requests",
}

export default async function SwapRequestPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason || !seasonTeam) {
    redirect("/team/not-in-season")
  }

  // PARALLELIZE: All these queries are independent
  const [activeSwapWindow, team, ownPlayers, allSeasonTeams, otherPlayers, allSeasonRequests] = await Promise.all([
    // Active swap window
    prisma.swap_windows.findFirst({
      where: { seasonId: activeSeason.id, status: 'ACTIVE' }
    }),
    // Team info
    prisma.teams.findUnique({ where: { id: session.user.teamId } }),
    // Own squad players
    prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id, teamId: session.user.teamId, status: 'ACTIVE' },
      include: {
        basePlayer: {
          select: {
            id: true, name: true, player_id: true,
            seasonalPlayerStats: { where: { seasonId: activeSeason.id }, select: { position: true, position_group: true, overallRating: true, realWorldClub: true, playing_style: true } },
          },
        },
      },
      orderBy: { soldPrice: 'desc' },
    }),
    // All teams in season
    prisma.season_teams.findMany({
      where: { seasonId: activeSeason.id },
      include: { team: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { team: { name: 'asc' } },
    }),
    // Other players
    prisma.transfer_history.findMany({
      where: { seasonId: activeSeason.id, teamId: { not: session.user.teamId }, status: 'ACTIVE' },
      include: {
        team: { select: { id: true, name: true, logoUrl: true } },
        basePlayer: {
          select: {
            id: true, name: true, player_id: true,
            seasonalPlayerStats: { where: { seasonId: activeSeason.id }, select: { position: true, position_group: true, overallRating: true, realWorldClub: true, playing_style: true } },
          },
        },
      },
      orderBy: { soldPrice: 'desc' },
    }),
    // All swap requests for active season (for stats & best deals)
    prisma.swap_requests.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        requestingTeam: { select: { id: true, name: true, logoUrl: true } },
        targetTeam: { select: { id: true, name: true, logoUrl: true } },
        players: {
          include: {
            basePlayer: {
              select: {
                id: true, name: true, player_id: true,
                seasonalPlayerStats: {
                  where: { seasonId: activeSeason.id },
                  select: { position: true, overallRating: true },
                },
              },
            },
            fromTeam: { select: { id: true, name: true } },
            toTeam: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
  ])

  if (!activeSwapWindow) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">Swap Request</span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-black text-white mb-2">Swap Window Closed</h2>
            <p className="text-gray-400">The swap request window is currently closed. Please check back later.</p>
          </div>
        </div>
      </div>
    )
  }

  // Transform data for client
  const myPlayers = ownPlayers.map(transfer => {
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
      teamId: session.user.teamId!,
      teamName: team?.name || '',
    }
  })

  const availablePlayers = otherPlayers.map(transfer => {
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
      teamId: transfer.teamId,
      teamName: transfer.team.name,
      teamLogo: transfer.team.logoUrl,
    }
  })

  const otherTeamsList = allSeasonTeams
    .filter(st => st.teamId !== session.user.teamId)
    .map(st => ({
      id: st.team.id,
      name: st.team.name,
      logoUrl: st.team.logoUrl,
    }))

  const allTeams = allSeasonTeams.map(st => ({
    id: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl,
    isMyTeam: st.teamId === session.user.teamId,
  }))

  const allRequestsTransformed = allSeasonRequests.map(req => ({
    id: req.id,
    requestingTeamId: req.requestingTeamId,
    requestingTeamName: req.requestingTeam.name,
    requestingTeamLogo: req.requestingTeam.logoUrl,
    targetTeamId: req.targetTeamId,
    targetTeamName: req.targetTeam.name,
    targetTeamLogo: req.targetTeam.logoUrl,
    isMyRequest: req.requestingTeamId === session.user.teamId || req.targetTeamId === session.user.teamId,
    status: req.status ?? '',
    submittedAt: req.submittedAt ? req.submittedAt.toISOString() : '',
    swapWindowId: req.swapWindowId,
    players: req.players.map(p => {
      const stats = p.basePlayer?.seasonalPlayerStats?.[0]
      return {
        id: p.id,
        playerId: p.playerId,
        playerName: p.playerName,
        playerPhotoId: p.basePlayer?.player_id || p.basePlayer?.id || p.playerId,
        fromTeamId: p.fromTeamId,
        fromTeamName: p.fromTeam.name,
        toTeamId: p.toTeamId,
        toTeamName: p.toTeam.name,
        playerValue: p.playerValue,
        position: stats?.position || 'Unknown',
        overall: stats?.overallRating || 0,
      }
    }),
  }))

  // Existing requests for the current team
  const requests = allRequestsTransformed.filter(
    req => req.requestingTeamId === session.user.teamId || req.targetTeamId === session.user.teamId
  )

  // Get requests for the current active swap window to calculate limits
  const activeWindowRequests = requests.filter(r => r.swapWindowId === activeSwapWindow.id)

  const pendingRequestsCount = activeWindowRequests.filter(r => r.status === 'pending').length
  const completedSwapsCount = activeWindowRequests.filter(r => r.status === 'approved').length
  const usedRequestsCount = pendingRequestsCount + completedSwapsCount

  const maxSwaps = activeSwapWindow.swapLimit || 5
  const isUnlimited = maxSwaps >= 999
  const limits = {
    totalRequests: usedRequestsCount,
    completedSwaps: completedSwapsCount,
    remainingRequests: isUnlimited ? 999 : Math.max(0, maxSwaps - usedRequestsCount),
    remainingSwaps: isUnlimited ? 999 : Math.max(0, maxSwaps - completedSwapsCount),
    canSubmit: isUnlimited || (usedRequestsCount < maxSwaps && completedSwapsCount < maxSwaps),
    maxSwaps,
  }

  return (
    <SwapRequestClient
      seasonId={activeSeason.id}
      seasonName={activeSeason.name}
      swapWindowId={activeSwapWindow.id}
      myTeamId={session.user.teamId!}
      myTeamName={team?.name || ''}
      myPlayers={myPlayers}
      availablePlayers={availablePlayers}
      teams={otherTeamsList}
      allTeams={allTeams}
      existingRequests={requests}
      allSeasonRequests={allRequestsTransformed}
      limits={limits}
    />
  )
}
