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

  // Check if swap window is open
  if (!activeSeason.swapWindowOpen) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Swap Request
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
            <h2 className="text-2xl font-black text-white mb-2">Swap Window Closed</h2>
            <p className="text-gray-400">The swap request window is currently closed. Please check back later.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get own squad players with status ACTIVE
  const ownPlayers = await prisma.transfer_history.findMany({
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

  // Get all other teams in the season
  const otherTeams = await prisma.season_teams.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: { not: session.user.teamId },
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
  })

  // Get all players from other teams
  const otherPlayers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: { not: session.user.teamId },
      status: 'ACTIVE',
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

  // Get existing pending swap requests (both as requester and target)
  const existingRequests = await prisma.swap_requests.findMany({
    where: {
      seasonId: activeSeason.id,
      OR: [
        { requestingTeamId: session.user.teamId },
        { targetTeamId: session.user.teamId },
      ],
      status: 'pending',
    },
    include: {
      requestingTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      targetTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
      players: {
        include: {
          basePlayer: {
            select: {
              id: true,
              name: true,
              player_id: true,
            },
          },
          fromTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          toTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

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

  const teams = otherTeams.map(st => ({
    id: st.team.id,
    name: st.team.name,
    logoUrl: st.team.logoUrl,
  }))

  const requests = existingRequests.map(req => ({
    id: req.id,
    requestingTeamId: req.requestingTeamId,
    requestingTeamName: req.requestingTeam.name,
    targetTeamId: req.targetTeamId,
    targetTeamName: req.targetTeam.name,
    isMyRequest: req.requestingTeamId === session.user.teamId,
    submittedAt: req.submittedAt.toISOString(),
    players: req.players.map(p => ({
      id: p.id,
      playerId: p.playerId,
      playerName: p.playerName,
      playerPhotoId: p.basePlayer.player_id || p.basePlayer.id,
      fromTeamId: p.fromTeamId,
      fromTeamName: p.fromTeam.name,
      toTeamId: p.toTeamId,
      toTeamName: p.toTeam.name,
      playerValue: p.playerValue,
    })),
  }))

  const totalRequestsCount = existingRequests.length
  const completedSwapsCount = existingRequests.filter(r => r.status === 'approved').length

  const limits = {
    totalRequests: totalRequestsCount,
    completedSwaps: completedSwapsCount,
    remainingRequests: Math.max(0, 5 - totalRequestsCount),
    remainingSwaps: Math.max(0, 5 - completedSwapsCount),
    canSubmit: totalRequestsCount < 5 && completedSwapsCount < 5,
  }

  return (
    <SwapRequestClient
      seasonId={activeSeason.id}
      myTeamId={session.user.teamId!}
      myTeamName={team?.name || ''}
      myPlayers={myPlayers}
      availablePlayers={availablePlayers}
      teams={teams}
      existingRequests={requests}
      limits={limits}
    />
  )
}
