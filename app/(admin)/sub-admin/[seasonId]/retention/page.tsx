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

  // Find previous season (by creation date)
  const previousSeason = await prisma.seasons.findFirst({
    where: {
      createdAt: { lt: season.createdAt }
    },
    orderBy: { createdAt: "desc" }
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

  const maxRetentionsPerTeam = 5 // Default retention limit

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
          Retain players from {previousSeason.name} for {season.name}
        </p>
      </div>

      {/* Season Info */}
      <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-6 mb-8 backdrop-blur-xl shadow-xl">
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
        teamsWithPlayers={teamsWithPlayers}
        maxRetentionsPerTeam={maxRetentionsPerTeam}
        existingRetentions={existingRetentions.map(r => ({
          basePlayerId: r.basePlayerId,
          teamId: teamsWithPlayers.find(t => 
            t.players.some(p => p.id === r.basePlayerId)
          )?.teamId || ""
        }))}
      />
    </div>
  )
}
