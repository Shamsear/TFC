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
    <div className="min-h-screen bg-[#0a0a0a] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{team?.name} Squad</h1>
              <p className="text-gray-400">{activeSeason.name}</p>
            </div>
            <Link
              href="/team"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Total Players</div>
              <div className="text-2xl font-bold text-white">{transfers.length}</div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Squad Value</div>
              <div className="text-2xl font-bold text-white">${totalValue.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
              <div className="text-gray-400 text-sm mb-1">Avg. Player Value</div>
              <div className="text-2xl font-bold text-white">
                ${transfers.length > 0 ? Math.round(totalValue / transfers.length).toLocaleString() : 0}
              </div>
            </div>
          </div>
        </div>

        {/* Squad by Position */}
        {transfers.length > 0 ? (
          <div className="space-y-8">
            {sortedPositions.map((position) => (
              <div key={position}>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#E8A800]/20 border border-[#E8A800]/30 rounded-lg text-[#E8A800]">
                    {position}
                  </span>
                  <span className="text-gray-400 text-sm">
                    ({playersByPosition[position].length} {playersByPosition[position].length === 1 ? "player" : "players"})
                  </span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {playersByPosition[position].map((player) => (
                    <Link
                      key={player.id}
                      href={`/team/squad/${player.basePlayer.id}`}
                      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-[#E8A800]/50 transition-all group"
                    >
                      {/* Player Photo */}
                      <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-[#E8A800]/20 to-[#FFB347]/20">
                        <img
                          src={getPlayerPhotoUrl(player.basePlayer.player_id || player.basePlayer.id)}
                          alt={player.basePlayer.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/default-player.png"
                          }}
                        />
                        {/* Rating Badge */}
                        {player.stats?.overallRating && (
                          <div className="absolute top-2 right-2 px-2 py-1 bg-[#0a0a0a]/80 backdrop-blur-sm rounded-lg">
                            <span className="text-[#E8A800] font-bold text-sm">
                              {player.stats.overallRating}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="space-y-2">
                        <h3 className="text-white font-bold group-hover:text-[#E8A800] transition-colors line-clamp-1">
                          {player.basePlayer.name}
                        </h3>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">{player.stats?.realWorldClub || "Unknown"}</span>
                          {player.stats?.star_rating && (
                            <span className="text-[#E8A800]">
                              {"⭐".repeat(player.stats.star_rating)}
                            </span>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Purchase Price</span>
                            <span className="text-white font-bold">${player.soldPrice.toLocaleString()}</span>
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
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Players Yet</h2>
            <p className="text-gray-400">Your squad is empty. Players will appear here after the auction.</p>
          </div>
        )}
      </div>
    </div>
  )
}
