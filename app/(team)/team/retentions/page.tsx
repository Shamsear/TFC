import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import TeamLogo from "@/components/team/TeamLogo"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"

export const metadata = {
  title: "Team Retentions | Turf Cats",
  description: "View retained players for the current season",
}

export default async function TeamRetentionsPage() {
  const session = await auth()

  if (!session?.user?.teamId) {
    redirect("/auth/signin")
  }

  const { isParticipating, activeSeason } = await checkTeamSeasonParticipation()

  if (!isParticipating || !activeSeason) {
    redirect("/team/not-in-season")
  }

  // Fetch all retentions for this season where the player ended up on this team
  // When a player is retained, a transfer_history record is created with active status for the new season
  const retentions = await prisma.retentions.findMany({
    where: {
      seasonId: activeSeason.id,
    },
    include: {
      basePlayer: {
        include: {
          transferHistory: {
            where: {
              seasonId: activeSeason.id,
              teamId: session.user.teamId,
              status: "ACTIVE",
            },
          },
          seasonalPlayerStats: {
            where: {
              seasonId: activeSeason.id,
            },
          },
        },
      },
      season: true,
    },
  })

  // Filter retentions to only those belonging to the team (where they have an ACTIVE transfer record this season)
  const teamRetentions = retentions.filter(r => r.basePlayer.transferHistory.length > 0)

  // Fetch previous season details if any
  const previousSeasonId = teamRetentions[0]?.retainedFromSeasonId
  const previousSeason = previousSeasonId 
    ? await prisma.seasons.findUnique({ where: { id: previousSeasonId } })
    : null

  // Calculate total spent/retained budget details
  const totalCost = teamRetentions.reduce((sum, r) => sum + (r.basePlayer.transferHistory[0]?.soldPrice || 0), 0)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Roster Retentions
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Players retained from {previousSeason?.name || "previous season"} for {activeSeason.name}
          </p>
        </div>

        {/* Retentions Stats Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Retained</div>
            <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">{teamRetentions.length}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Budget Invested</div>
            <div className="text-2xl sm:text-3xl font-black text-white">${totalCost.toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Average Player Cost</div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400">
              {teamRetentions.length > 0 
                ? `$${Math.round(totalCost / teamRetentions.length).toLocaleString()}` 
                : "$0"}
            </div>
          </div>
        </div>

        {/* Retained Players List */}
        {teamRetentions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamRetentions.map((retention) => {
              const player = retention.basePlayer
              const transfer = player.transferHistory[0]
              const rating = player.seasonalPlayerStats[0]?.overallRating || 80
              const position = player.seasonalPlayerStats[0]?.position || "MID"

              return (
                <div 
                  key={retention.id}
                  className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-5 hover:border-[#E8A800]/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#E8A800]/5 to-transparent rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex gap-4">
                    {/* Player Photo */}
                    <div className="relative w-16 h-16 rounded-xl bg-black/30 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img
                        src={getPlayerPhotoUrl(`${player.player_id || player.id}.webp`)}
                        alt={player.name}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/logo.jpeg"
                        }}
                      />
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-base truncate group-hover:text-[#E8A800] transition-colors">
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8A800]/10 border border-[#E8A800]/20 text-[#E8A800]">
                          {position}
                        </span>
                        <span className="text-gray-400 text-xs font-semibold">
                          Rating: <span className="text-white font-bold">{rating}</span>
                        </span>
                      </div>
                      <div className="text-[#7A7367] text-xs mt-1">
                        ID: <span className="font-mono">{player.player_id || player.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Retention Cost */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Retention Cost</span>
                    <span className="text-base font-black text-emerald-400">
                      ${transfer?.soldPrice?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-12 text-center">
            <svg className="w-16 h-16 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold text-white mb-2">No Retained Players Found</h3>
            <p className="text-gray-400 max-w-md mx-auto text-sm sm:text-base">
              Your team did not retain any players from {previousSeason?.name || "the previous season"} for {activeSeason.name}.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
