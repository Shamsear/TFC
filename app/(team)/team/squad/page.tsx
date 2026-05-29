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
      <div className="min-h-screen bg-[#0a0a0a] py-16 flex items-center justify-center relative overflow-hidden">
        {/* Dynamic Background Spotlights */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        
        <div className="max-w-md w-full mx-auto px-6 text-center relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-xl flex items-center justify-center text-amber-500 mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-3">No Active Season</h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            There is currently no active season in progress. Roster stats will become available once the season starts.
          </p>
        </div>
      </div>
    )
  }

  // Get team info
  const team = await prisma.teams.findUnique({
    where: { id: session.user.teamId },
  })

  // Get squad players (only ACTIVE players)
  const transfers = await prisma.transfer_history.findMany({
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
  const positionOrder = ["GK", "CB", "LB", "RB", "DMF", "CMF", "AMF", "LMF", "RMF", "LWF", "RWF", "SS", "CF"]
  const sortedPositions = Object.keys(playersByPosition).sort((a, b) => {
    const indexA = positionOrder.indexOf(a)
    const indexB = positionOrder.indexOf(b)
    if (indexA === -1) return 1
    if (indexB === -1) return -1
    return indexA - indexB
  })

  // Calculate total squad value
  const totalValue = transfers.reduce((sum, t) => sum + t.soldPrice, 0)

  // Helper to resolve colored styling for dynamic badges matching TFC style
  const getPositionColor = (pos: string) => {
    switch (pos.toUpperCase()) {
      case 'GK': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
      case 'CB': return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      case 'LB': return 'bg-blue-400/10 border-blue-400/30 text-blue-300'
      case 'RB': return 'bg-blue-400/10 border-blue-400/30 text-blue-300'
      case 'DMF': return 'bg-green-600/10 border-green-600/30 text-green-500'
      case 'CMF': return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'LMF': return 'bg-green-400/10 border-green-400/30 text-green-300'
      case 'RMF': return 'bg-green-400/10 border-green-400/30 text-green-300'
      case 'AMF': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'SS': return 'bg-orange-500/10 border-orange-500/30 text-orange-400'
      case 'LWF': return 'bg-red-400/10 border-red-400/30 text-red-300'
      case 'RWF': return 'bg-red-400/10 border-red-400/30 text-red-300'
      case 'CF': return 'bg-red-500/10 border-red-500/30 text-red-400'
      default: return 'bg-gray-500/10 border-gray-500/30 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-16 relative overflow-hidden">
      {/* Decorative Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-amber-500/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.03] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.03] blur-[120px] pointer-events-none" />

      {/* Dynamic Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-full text-xs font-semibold text-[#D4CCBB] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
              {activeSeason.name}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                {team?.name}
              </span>
              <span className="text-white"> Squad</span>
            </h1>
          </div>

          {/* Squad Control Bar */}
          <div className="flex items-center gap-3">
            <Link 
              href="/team/squad/builder" 
              className="group relative inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 font-extrabold text-sm whitespace-nowrap transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:text-white transform active:scale-95 cursor-pointer"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl blur-sm" />
              <svg className="w-4.5 h-4.5 text-cyan-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Squad Builder
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {/* Card 1: Total Players */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/[0.04] transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Squad</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{transfers.length}</span>
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Active Players</span>
            </div>
            <p className="text-xs text-gray-400 mt-3 border-t border-white/5 pt-3">
              Roster count registered in {activeSeason.name}
            </p>
          </div>

          {/* Card 2: Squad Value */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/[0.04] transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Squad Value</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 tracking-tight">
                £{totalValue.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-3 border-t border-white/5 pt-3">
              Total expenditure across registered active transfers
            </p>
          </div>

          {/* Card 3: Avg Value */}
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.02] rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/[0.04] transition-colors" />
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg. Player Price</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#FFB347] tracking-tight">
                £{transfers.length > 0 ? Math.round(totalValue / transfers.length).toLocaleString() : 0}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-3 border-t border-white/5 pt-3">
              Average purchase price calculated per player
            </p>
          </div>
        </div>

        {/* Squad list by Position */}
        {transfers.length > 0 ? (
          <div className="space-y-12">
            {sortedPositions.map((position) => (
              <div key={position} className="animate-[fadeIn_0.4s_ease-out]">
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-6">
                  <span className={`px-3 py-1 rounded-lg border font-black text-xs tracking-wider uppercase ${getPositionColor(position)}`}>
                    {position}
                  </span>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    {playersByPosition[position].length} {playersByPosition[position].length === 1 ? "Player" : "Players"}
                  </span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {playersByPosition[position].map((player) => (
                    <Link
                      key={player.id}
                      href={`/team/squad/${player.basePlayer.id}`}
                      className="relative block rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 p-4 sm:p-5 hover:border-amber-500/40 hover:bg-white/[0.03] transition-all duration-300 group shadow-lg hover:shadow-[0_0_30px_rgba(232,168,0,0.1)] overflow-hidden"
                    >
                      {/* Interactive glowing spotlight inside the card on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      <div className="flex gap-4 relative z-10">
                        {/* Player Photo Frame */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex-shrink-0 shadow-inner group-hover:border-amber-500/30 transition-colors">
                          <img
                            src={getPlayerPhotoUrl(`${player.basePlayer.player_id}.webp`)}
                            alt={player.basePlayer.name}
                            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-[10px] font-extrabold text-[#D4CCBB] tracking-wider uppercase">
                                {player.stats?.position_group && player.stats.position_group !== 'ALL' 
                                  ? `${player.stats.position} • ${player.stats.position_group}`
                                  : player.stats?.position || position}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-[#E8A800] tracking-wider uppercase">
                                ★ {player.stats?.overallRating || 'N/A'} OVR
                              </span>
                            </div>
                            
                            <h3 className="text-base sm:text-lg font-black text-white group-hover:text-[#FFB347] transition-colors leading-tight truncate">
                              {player.basePlayer.name}
                            </h3>

                            <p className="text-xs text-gray-400 font-medium mt-1 flex items-center gap-1.5 truncate">
                              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {player.stats?.realWorldClub || "Unknown Club"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Financial Price Ledger Section */}
                      <div className="mt-4 flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 group-hover:border-emerald-500/20 transition-colors relative z-10">
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Purchase Price</span>
                        <span className="text-sm font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.1)]">
                          £{player.soldPrice.toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Premium Empty State */
          <div className="text-center py-20 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-white/[0.01] blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-xl flex items-center justify-center text-gray-500 mx-auto mb-6">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">No Active Roster Players</h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-sm mx-auto leading-relaxed mb-6">
                Your squad is currently empty. Acquire premium players during the draft auction to fill your ranks.
              </p>
              <Link 
                href="/team/squad/builder" 
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-black font-extrabold text-sm shadow-[0_0_20px_rgba(232,168,0,0.2)] hover:shadow-[0_0_25px_rgba(232,168,0,0.3)] transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                Go to Squad Builder
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
