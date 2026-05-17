import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"

export const metadata = {
  title: "Squad | Team Dashboard",
  description: "View your team squad",
}

export default async function SquadPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  // Check if team is in active season
  const { isParticipating, activeSeason, seasonTeam } = await checkTeamSeasonParticipation()

  if (!isParticipating) {
    redirect("/team/not-in-season")
  }

  if (!activeSeason || !seasonTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">No Active Season</h1>
            <p className="text-gray-400">There is no active season at the moment.</p>
          </div>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get squad players
  const transfers = await prisma.transfer_history.findMany({
    where: {
      seasonId: activeSeason.id,
      teamId: session.user.teamId,
    },
    include: {
      basePlayer: {
        include: {
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
          },
        },
      },
    },
    orderBy: {
      soldPrice: "desc",
    },
  })

  // Group players by position
  const playersByPosition = transfers.reduce((acc, transfer) => {
    const stats = transfer.basePlayer.seasonalPlayerStats[0]
    const position = stats?.position || "Unknown"
    if (!acc[position]) {
      acc[position] = []
    }
    acc[position].push({
      ...transfer,
      stats,
    })
    return acc
  }, {} as Record<string, any[]>)

  // Position order for display
  const positionOrder = ["GK", "CB", "LB", "RB", "DMF", "CMF", "LMF", "RMF", "AMF", "LWF", "RWF", "CF", "SS"]
  const sortedPositions = Object.keys(playersByPosition).sort((a, b) => {
    const indexA = positionOrder.indexOf(a)
    const indexB = positionOrder.indexOf(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Calculate total squad value
  const totalValue = transfers.reduce((sum, t) => sum + t.soldPrice, 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-12">
        {/* Compact Header */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-black mb-1">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              {team?.name} Squad
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-xs sm:text-sm">{activeSeason.name}</p>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-[#7A7367] mb-1">Players</div>
            <div className="text-xl sm:text-2xl font-black text-white">{transfers.length}</div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-[#7A7367] mb-1">Value</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400">${(totalValue / 1000).toFixed(0)}k</div>
          </div>
          <div className="rounded-lg bg-white/5 border border-white/10 p-3">
            <div className="text-xs text-[#7A7367] mb-1">Avg</div>
            <div className="text-xl sm:text-2xl font-black text-[#FFB347]">
              ${transfers.length > 0 ? Math.round(totalValue / transfers.length) : 0}
            </div>
          </div>
        </div>

        {/* Compact Squad by Position */}
        {transfers.length > 0 ? (
          <div className="space-y-4">
            {sortedPositions.map((position) => (
              <div key={position}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded text-[#E8A800] text-xs font-bold">
                    {position}
                  </span>
                  <span className="text-[#7A7367] text-xs">
                    {playersByPosition[position].length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                  {playersByPosition[position].map((player) => (
                    <Link
                      key={player.id}
                      href={`/team/squad/${player.basePlayer.id}`}
                      className="rounded-lg bg-white/5 border border-white/10 p-2 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all group"
                    >
                      {/* Player Photo */}
                      <div className="relative w-full aspect-square mb-2 rounded overflow-hidden bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10">
                        <img
                          src={getPlayerPhotoUrl(player.basePlayer.player_id || player.basePlayer.id)}
                          alt={player.basePlayer.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Rating Badge */}
                        {player.stats?.overallRating && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-[#0a0a0a]/90 backdrop-blur-sm rounded text-[#E8A800] font-bold text-xs">
                            {player.stats.overallRating}
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="space-y-1">
                        <h3 className="text-white font-bold group-hover:text-[#E8A800] transition-colors line-clamp-1 text-xs">
                          {player.basePlayer.name}
                        </h3>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#7A7367] text-[10px]">${(player.soldPrice / 1000).toFixed(0)}k</span>
                          {player.stats?.star_rating && (
                            <span className="text-[#E8A800] text-[10px]">
                              {"⭐".repeat(player.stats.star_rating)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-white mb-2">No Players Yet</h2>
            <p className="text-[#7A7367] text-sm">Your squad is empty. Players will appear here after the auction.</p>
          </div>
        )}
      </div>
    </div>
  )
}
