import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { checkTeamSeasonParticipation } from "@/lib/team-auth"
import TeamLogo from "@/components/team/TeamLogo"
import { getPlayerPhotoUrl } from "@/lib/image-cdn"
import Link from "next/link"

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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Back Button Header */}
        <Link
          href="/team"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-semibold text-sm cursor-pointer mb-6 transform active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
              Roster Retentions
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-xs font-bold uppercase tracking-wider">
            Retained from {previousSeason?.name || "previous season"} for {activeSeason.name}
          </p>
        </div>

        {/* Retentions Stats Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 backdrop-blur-md shadow-lg">
            <div className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1">Total Retained</div>
            <div className="text-2xl sm:text-3xl font-black text-[#E8A800] mt-1 drop-shadow-[0_0_8px_rgba(232,168,0,0.15)]">{teamRetentions.length}</div>
          </div>
          <div className="rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/20 p-5 backdrop-blur-md shadow-lg">
            <div className="text-emerald-500/70 text-[10px] font-black uppercase tracking-wider mb-1">Total Budget Invested</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">£{totalCost.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-purple-500/[0.02] border border-purple-500/20 p-5 backdrop-blur-md shadow-lg">
            <div className="text-purple-500/70 text-[10px] font-black uppercase tracking-wider mb-1">Average Player Cost</div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1 drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]">
              {teamRetentions.length > 0 
                ? `£${Math.round(totalCost / teamRetentions.length).toLocaleString()}` 
                : "£0"}
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

              // Premium position outline badges
              const getPositionColor = (pos: string) => {
                const p = pos.toUpperCase()
                if (p === 'GK') return 'border-[#E8A800]/30 bg-[#E8A800]/10 text-[#E8A800]'
                if (['CB', 'LB', 'RB'].includes(p)) return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                if (['DMF', 'CMF', 'LMF', 'RMF', 'AMF'].includes(p)) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                if (['SS', 'LWF', 'RWF', 'CF'].includes(p)) return 'border-red-500/30 bg-red-500/10 text-red-400'
                return 'border-gray-500/30 bg-gray-500/10 text-gray-400'
              }

              return (
                <div 
                  key={retention.id}
                  className="rounded-2xl bg-white/[0.01] border border-white/10 p-5 hover:border-[#E8A800]/30 hover:bg-white/[0.04] hover:-translate-y-1 shadow-xl hover:shadow-[0_12px_24px_rgba(232,168,0,0.08)] transition-all duration-300 group relative overflow-hidden backdrop-blur-md"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#E8A800]/5 to-transparent rounded-bl-full pointer-events-none"></div>
                  
                  <div className="flex gap-4">
                    {/* Player Photo */}
                    <div className="relative w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      <img
                        src={getPlayerPhotoUrl(`${player.player_id || player.id}.webp`)}
                        alt={player.name}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/default-player.png"
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-white text-base truncate group-hover:text-[#E8A800] transition-colors leading-tight">
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black tracking-wider uppercase ${getPositionColor(position)}`}>
                          {position}
                        </span>
                        <span className="text-gray-400 text-xs font-bold">
                          Rating: <span className="text-[#FFB347] font-black">{rating}</span>
                        </span>
                      </div>
                      <div className="text-[#7A7367] text-[10px] font-bold mt-2 uppercase tracking-wider">
                        ID: <span className="font-mono text-gray-400 lowercase">{player.player_id || player.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Retention Cost */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Retention Ledger Fee</span>
                    <span className="text-base font-black text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.15)]">
                      £{transfer?.soldPrice?.toLocaleString() || "0"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-12 text-center backdrop-blur-md shadow-lg">
            <svg className="w-16 h-16 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-bold text-white mb-2">No Retained Players Found</h3>
            <p className="text-gray-500 font-semibold max-w-md mx-auto text-xs uppercase tracking-wider leading-relaxed">
              Your franchise did not retain any players from {previousSeason?.name || "the previous season"} for {activeSeason.name}.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
