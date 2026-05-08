import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import RetentionModule from "@/components/retention/RetentionModule"

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
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 sm:pb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
                <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                  Player Retention
                </span>
              </h1>
              <p className="text-[#D4CCBB] text-sm sm:text-base">
                Retain players from previous season for {season.name}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-lg sm:text-xl font-black text-white mb-2">No Previous Season Found</div>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              This is the first season, so there are no players to retain from a previous season.
            </p>
          </div>
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
        photoUrl: p.basePlayer.photoUrl,
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2 sm:pb-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
                Player Retention
              </span>
            </h1>
            <p className="text-[#D4CCBB] text-sm sm:text-base">
              Retain players from {previousSeason.name} for {season.name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Season Info */}
        <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center lg:text-left">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 font-medium">Current Season</div>
              <div className="text-lg sm:text-xl font-black text-white">{season.name}</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 font-medium">Previous Season</div>
              <div className="text-lg sm:text-xl font-black text-[#E8A800]">{previousSeason.name}</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 font-medium">Max Per Team</div>
              <div className="text-lg sm:text-xl font-black text-purple-400">{maxRetentionsPerTeam}</div>
            </div>
            <div className="text-center lg:text-left">
              <div className="text-xs sm:text-sm text-[#7A7367] mb-1 font-medium">Already Retained</div>
              <div className="text-lg sm:text-xl font-black text-emerald-400">{existingRetentions.length}</div>
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
    </div>
  )
}
