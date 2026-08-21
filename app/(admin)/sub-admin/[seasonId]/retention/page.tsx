import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import RetentionModule from "@/components/retention/RetentionModule"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export default async function RetentionModulePage({
  params,
}: {
  params: Promise<{ seasonId: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const { seasonId } = await params

  // Fetch current season details
  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    include: {
      seasonTeams: {
        include: { team: true }
      }
    }
  })

  if (!season) {
    redirect("/sub-admin")
  }

  // Find previous season by season number
  const previousSeason = await prisma.seasons.findFirst({
    where: {
      seasonNumber: { lt: season.seasonNumber! }
    },
    orderBy: { seasonNumber: "desc" }
  })

  if (!previousSeason) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/sub-admin"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Player Retention
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            Retain players from previous season for {season.name}
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-8 sm:p-12 text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8A800] mx-auto mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-xl font-black text-white mb-2 uppercase tracking-wide">No Previous Season Found</div>
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            There must be at least one previous season to perform player retention.
          </p>
        </div>
      </div>
    )
  }

  // Get transfer history from previous season with player stats from previous season
  const transferHistory = await prisma.transfer_history.findMany({
    where: {
      seasonId: previousSeason.id
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: { seasonId: previousSeason.id }
          }
        }
      },
      team: true
    }
  })

  // Group players by team from previous season
  const teamPlayersMap = new Map<string, Array<{
    basePlayer: any
    soldPrice: number
  }>>()

  for (const transfer of transferHistory) {
    const teamId = transfer.teamId
    if (!teamPlayersMap.has(teamId)) {
      teamPlayersMap.set(teamId, [])
    }
    teamPlayersMap.get(teamId)!.push({
      basePlayer: transfer.basePlayer,
      soldPrice: transfer.soldPrice
    })
  }

  // Convert to array format for component
  const teamsWithPlayers = Array.from(teamPlayersMap.entries()).map(([teamId, players]) => {
    const team = transferHistory.find(t => t.teamId === teamId)?.team
    return {
      teamId,
      teamName: team?.name || "Unknown Team",
      teamLogoUrl: team?.logoUrl || "",
      players: players.map(p => ({
        id: p.basePlayer.id,
        name: p.basePlayer.name,
        photoUrl: getPlayerPhotoUrl(`${p.basePlayer.player_id || p.basePlayer.id}.webp`),
        position: p.basePlayer.seasonalPlayerStats[0]?.position || "N/A",
        overallRating: p.basePlayer.seasonalPlayerStats[0]?.overallRating || 0,
        soldPrice: p.soldPrice
      }))
    }
  })

  // Check if retention has already been done for this season
  const existingRetentions = await prisma.retentions.findMany({
    where: { seasonId }
  })

  // Get active retention window
  const activeWindow = await prisma.retention_windows.findFirst({
    where: {
      seasonId,
      status: 'ACTIVE',
    },
  })

  const maxRetentionsPerTeam = activeWindow?.retentionLimit || 5

  // Get banned team IDs from the window
  const bannedTeamIds = activeWindow?.bannedTeamIds
    ? JSON.parse(activeWindow.bannedTeamIds) as string[]
    : []

  // Filter out banned teams from the players list
  const filteredTeamsWithPlayers = bannedTeamIds.length > 0
    ? teamsWithPlayers.filter(t => !bannedTeamIds.includes(t.teamId))
    : teamsWithPlayers

  // Identify ineligible teams based on manager presence:
  // A team is ineligible if its manager did NOT participate in the previous season (with any team)
  const previousSeasonTeams = await prisma.season_teams.findMany({
    where: { seasonId: previousSeason.id },
    select: { managerName: true },
  })
  const previousSeasonManagerNames = new Set(
    previousSeasonTeams.map(st => st.managerName).filter(Boolean)
  )

  // Current season teams whose manager did NOT participate in the previous season
  const ineligibleNoPreviousSeason = season.seasonTeams
    .filter(st => !st.managerName || !previousSeasonManagerNames.has(st.managerName))
    .map(st => ({
      teamId: st.team.id,
      teamName: st.team.name,
      teamLogoUrl: st.team.logoUrl || "",
      managerName: st.managerName || "",
      reason: "new_team" as const,
    }))

  // Banned teams (may or may not have players from previous season)
  const ineligibleBannedTeams = bannedTeamIds.length > 0
    ? season.seasonTeams
        .filter(st => bannedTeamIds.includes(st.teamId))
        .map(st => ({
          teamId: st.team.id,
          teamName: st.team.name,
          teamLogoUrl: st.team.logoUrl || "",
          managerName: st.managerName || "",
          reason: "banned" as const,
        }))
    : []

  const ineligibleTeams = [...ineligibleNoPreviousSeason, ...ineligibleBannedTeams]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/sub-admin"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E8A800] hover:text-[#FFC93A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
            Player Retention
          </h1>
          <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
            Retain players from {previousSeason.name} for {season.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/sub-admin/${seasonId}/retention-windows`}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 bg-white/[0.03] border border-white/10 text-white rounded-lg sm:rounded-xl font-bold hover:bg-white/[0.06] transition-all text-xs sm:text-sm font-mono uppercase"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Windows
          </Link>
          <Link
            href={`/sub-admin/${seasonId}/retention-requests`}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-[#0a0a0a] rounded-lg sm:rounded-xl font-bold hover:from-[#FFC93A] hover:to-[#FFB347] transition-all hover:scale-105 shadow-lg hover:shadow-[#E8A800]/50 text-xs sm:text-sm font-mono uppercase"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Requests
          </Link>
        </div>
      </div>

      {/* Season Info */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 mb-8 backdrop-blur-xl shadow-xl">
        {/* Active Window Info */}
        {activeWindow && (
          <div className="mb-4 p-4 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#E8A800] font-mono">{activeWindow.name}</p>
                <p className="text-xs text-gray-400 font-mono">
                  {new Date(activeWindow.startDate).toLocaleDateString()} - {new Date(activeWindow.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-xs font-black text-green-400 font-mono uppercase">{activeWindow.status}</p>
              </div>
            </div>
          </div>
        )}
        {!activeWindow && (
          <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-xs font-bold text-yellow-400 font-mono">
              No active retention window. <Link href={`/sub-admin/${seasonId}/retention-windows`} className="underline hover:text-yellow-300">Create one</Link> to set limits and eligible teams.
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center lg:text-left">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Current Season</div>
            <div className="text-lg sm:text-xl font-black text-white">{season.name}</div>
          </div>
          <div className="text-center lg:text-left">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Previous Season</div>
            <div className="text-lg sm:text-xl font-black text-[#E8A800]">{previousSeason.name}</div>
          </div>
          <div className="text-center lg:text-left">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Max Per Team</div>
            <div className="text-lg sm:text-xl font-black text-purple-400 font-mono">{maxRetentionsPerTeam}</div>
          </div>
          <div className="text-center lg:text-left">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest font-mono mb-1">Already Retained</div>
            <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">{existingRetentions.length}</div>
          </div>
        </div>
      </div>

      {/* Retention Module */}
      <RetentionModule
        seasonId={seasonId}
        previousSeasonId={previousSeason.id}
        teamsWithPlayers={filteredTeamsWithPlayers}
        maxRetentionsPerTeam={maxRetentionsPerTeam}
        existingRetentions={existingRetentions.map(r => ({
          basePlayerId: r.basePlayerId,
          teamId: teamsWithPlayers.find(t => 
            t.players.some(p => p.id === r.basePlayerId)
          )?.teamId || ""
        }))}
        ineligibleTeams={ineligibleTeams}
      />
    </div>
  )
}
