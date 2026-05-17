import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getPlayerPhotoUrl } from '@/lib/image-cdn'
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
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              {team?.name} Squad
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">{activeSeason.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Total Players</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">{transfers.length}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Squad Value</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400">${totalValue.toLocaleString()}</div>
          </div>
          <div className="rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="text-xs sm:text-sm text-[#7A7367] mb-1 sm:mb-2 font-medium">Avg. Player Value</div>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FFB347]">
              ${transfers.length > 0 ? Math.round(totalValue / transfers.length).toLocaleString() : 0}
            </div>
          </div>
        </div>

        {/* Squad by Position */}
        {transfers.length > 0 ? (
          <div className="space-y-6 sm:space-y-8">
            {sortedPositions.map((position) => (
              <div key={position}>
                <h2 className="text-lg sm:text-xl font-black text-white mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#E8A800]/10 border border-[#E8A800]/20 rounded-lg text-[#E8A800] text-sm sm:text-base">
                    {position}
                  </span>
                  <span className="text-[#7A7367] text-xs sm:text-sm">
                    ({playersByPosition[position].length} {playersByPosition[position].length === 1 ? "player" : "players"})
                  </span>
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {playersByPosition[position].map((player) => (
                    <Link
                      key={player.id}
                      href={`/team/squad/${player.basePlayer.id}`}
                      className="rounded-xl bg-white/5 border border-white/10 p-4 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all group relative"
                    >
                      {/* Player Card - Horizontal Layout */}
                      <div className="flex gap-4">
                        {/* Player Photo - Left Side */}
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 flex-shrink-0">
                          <img
                            src={getPlayerPhotoUrl(`${player.basePlayer.player_id}.webp`)}
                            alt={player.basePlayer.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Player Info - Right Side */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full border border-[#E8A800]/30 bg-[#E8A800]/20 text-[#E8A800] text-xs font-bold">
                                {player.stats?.position || position}
                              </span>
                              {player.stats?.position_group && player.stats.position_group !== 'ALL' && (
                                <span className="px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/20 text-purple-300 text-xs font-bold">
                                  Group {player.stats.position_group}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full border border-[#FFB347]/30 bg-[#FFB347]/20 text-[#FFB347] text-xs font-bold">
                                {player.stats?.overallRating || 'N/A'}
                              </span>
                            </div>
                            <h3 className="text-base font-black text-white mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-1">
                              {player.basePlayer.name}
                            </h3>
                            <div className="text-xs text-gray-400 truncate">{player.stats?.realWorldClub || "Unknown Club"}</div>
                          </div>
                        </div>
                      </div>

                      {/* Purchase Price */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                          <div className="text-xs text-gray-400">Purchase Price</div>
                          <div className="text-sm font-bold text-emerald-400">
                            ${player.soldPrice.toLocaleString()}
                          </div>
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#7A7367]/10 border border-[#7A7367]/20 flex items-center justify-center text-[#7A7367] mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">No Players Yet</h2>
            <p className="text-[#7A7367] text-sm sm:text-base">Your squad is empty. Players will appear here after the auction.</p>
          </div>
        )}
      </div>
    </div>
  )
}
