import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'

interface AllTeamsPageProps {
  params: Promise<{
    seasonId: string
  }>
}

export default async function AllTeamsPage({ params }: AllTeamsPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { seasonId } = await params

  const season = await prisma.seasons.findUnique({
    where: { id: seasonId },
    select: {
      id: true,
      name: true,
      startingPurse: true,
      seasonTeams: {
        select: {
          id: true,
          currentBudget: true,
          trophiesWon: true,
          team: {
            select: {
              id: true,
              name: true,
              managerName: true,
              logoUrl: true
            }
          }
        },
        orderBy: {
          currentBudget: 'desc'
        }
      }
    }
  })

  if (!season) {
    notFound()
  }

  // Get aggregated player counts and spending for all teams in 3 optimized parallel queries
  const [playerCounts, totalSpents, positionsByTeam] = await Promise.all([
    // Count ACTIVE players per team
    prisma.transfer_history.groupBy({
      by: ['teamId'],
      where: {
        seasonId,
        status: 'ACTIVE'
      },
      _count: {
        _all: true
      }
    }),
    
    // Sum total spent per team
    prisma.transfer_history.groupBy({
      by: ['teamId'],
      where: {
        seasonId
      },
      _sum: {
        soldPrice: true
      }
    }),
    
    // Get position breakdown per team (only ACTIVE players)
    prisma.$queryRaw<Array<{ teamId: string; position: string; count: bigint }>>`
      SELECT th."teamId", sps.position, COUNT(*)::bigint as count
      FROM transfer_history th
      INNER JOIN seasonal_player_stats sps ON th."basePlayerId" = sps."basePlayerId"
      WHERE th."seasonId" = ${seasonId}
        AND th."status" = 'ACTIVE'
        AND sps."seasonId" = ${seasonId}
      GROUP BY th."teamId", sps.position
      ORDER BY th."teamId", sps.position
    `
  ])

  // Map results for quick lookup
  const countMap = new Map(playerCounts.map(pc => [pc.teamId, pc._count._all]))
  const spentMap = new Map(totalSpents.map(ts => [ts.teamId, ts._sum.soldPrice || 0]))
  
  const positionMapByTeam = new Map<string, Record<string, number>>()
  for (const { teamId, position, count } of positionsByTeam) {
    if (!positionMapByTeam.has(teamId)) {
      positionMapByTeam.set(teamId, {})
    }
    positionMapByTeam.get(teamId)![position] = Number(count)
  }

  // Combine with seasonTeams
  const teamsWithDetails = season.seasonTeams.map(st => {
    return {
      ...st,
      playerCount: countMap.get(st.team.id) || 0,
      totalSpent: spentMap.get(st.team.id) || 0,
      playersByPosition: positionMapByTeam.get(st.team.id) || {}
    }
  })

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`
  }

  const getPositionColor = (pos: string) => {
    switch (pos.toUpperCase()) {
      case 'GK': return 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
      case 'CB': return 'bg-blue-500/10 border-blue-500/25 text-blue-400'
      case 'LB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'RB': return 'bg-blue-400/10 border-blue-400/25 text-blue-300'
      case 'DMF': return 'bg-green-600/10 border-green-600/25 text-green-500'
      case 'CMF': return 'bg-green-500/10 border-green-500/25 text-green-400'
      case 'LMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'RMF': return 'bg-green-400/10 border-green-400/25 text-green-300'
      case 'AMF': return 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
      case 'SS': return 'bg-orange-500/10 border-orange-500/25 text-orange-400'
      case 'LWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'RWF': return 'bg-red-400/10 border-red-400/25 text-red-300'
      case 'CF': return 'bg-red-500/10 border-red-500/25 text-red-400'
      default: return 'bg-gray-500/10 border-gray-500/25 text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-10 pb-16 relative overflow-hidden">
      {/* Spotlights */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-[#E8A800]/[0.02] blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-500/[0.02] blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <div className="relative border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-md mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/10 rounded-full text-xs font-semibold text-[#D4CCBB] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A800] animate-pulse" />
              Administrative Overview
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
              <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(232,168,0,0.15)]">
                Season
              </span>
              <span className="text-white"> Franchises</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold mt-1.5 uppercase tracking-wider">
              {season.name} • TOTAL SQUAD VALUE & BUDGET LEDGERS
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Registered Teams</div>
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">{season.seasonTeams.length}</div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Starting Purse</div>
            <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-[#FFB347] tracking-tight">
              {formatCurrency(season.startingPurse)}
            </div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Active Roster Players</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {teamsWithDetails.reduce((sum, t) => sum + t.playerCount, 0)}
            </div>
          </div>

          <div className="relative rounded-2xl bg-white/[0.01] border border-white/5 p-4 sm:p-5 backdrop-blur-xl shadow-lg overflow-hidden group">
            <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-1.5">Total Invested</div>
            <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-tight">
              {formatCurrency(teamsWithDetails.reduce((sum, t) => sum + t.totalSpent, 0))}
            </div>
          </div>
        </div>

        {/* Teams Listing Grid */}
        {season.seasonTeams.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.01] border border-white/5 p-12 sm:p-16 text-center backdrop-blur-xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-xl flex items-center justify-center text-[#E8A800] mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white mb-2">No Teams Assigned</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed mb-6">
              Assign teams to this season to get started with the league dashboard.
            </p>
            <Link
              href={`/sub-admin/${seasonId}/teams`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all text-sm shadow-md"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Assign Teams
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {teamsWithDetails.map((teamDetail) => {
              return (
                <Link
                  key={teamDetail.id}
                  href={`/sub-admin/${seasonId}/all-teams/${teamDetail.team.id}`}
                  className="relative block rounded-2xl bg-[#0d0d0d]/40 backdrop-blur-xl border border-white/5 p-5 sm:p-6 hover:border-amber-500/30 hover:bg-white/[0.01] transition-all duration-300 group cursor-pointer overflow-hidden shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] via-transparent to-transparent pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center gap-5 relative z-10">
                    {/* Team Logo Frame */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/40 p-1.5 flex-shrink-0 group-hover:scale-[1.02] ring-4 ring-white/5 transition-all flex items-center justify-center shadow-lg">
                      {teamDetail.team.logoUrl ? (
                        <Image
                          src={teamDetail.team.logoUrl}
                          alt={teamDetail.team.name}
                          fill
                          className="object-contain p-2 rounded-xl"
                          unoptimized
                        />
                      ) : (
                        <svg className="w-8 h-8 text-white/25" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                        </svg>
                      )}
                    </div>

                    {/* Team Details */}
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-xl font-black tracking-tight group-hover:text-[#FFB347] transition-colors truncate">
                            {teamDetail.team.name}
                          </h3>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                            Manager: {teamDetail.team.managerName}
                          </p>
                        </div>

                        {teamDetail.trophiesWon > 0 && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider self-start sm:self-center shadow-inner animate-[pulse_4s_infinite]">
                            🏆 {teamDetail.trophiesWon} Trophy{teamDetail.trophiesWon !== 1 ? 'ies' : ''}
                          </div>
                        )}
                      </div>

                      {/* Mini Stats Ledger Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-0.5">Available budget</div>
                          <div className="text-sm font-black text-emerald-400">
                            {formatCurrency(teamDetail.currentBudget)}
                          </div>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-0.5">Total Spent</div>
                          <div className="text-sm font-black text-[#FFB347]">
                            {formatCurrency(teamDetail.totalSpent)}
                          </div>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-0.5">Roster players</div>
                          <div className="text-sm font-black text-cyan-400">
                            {teamDetail.playerCount}
                          </div>
                        </div>

                        <div className="rounded-xl bg-black/40 border border-white/5 p-3">
                          <div className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mb-0.5">Remaining</div>
                          <div className="text-sm font-black text-purple-400">
                            {formatCurrency(teamDetail.currentBudget)}
                          </div>
                        </div>
                      </div>

                      {/* Squad Breakdown */}
                      {Object.keys(teamDetail.playersByPosition).length > 0 && (
                        <div className="border-t border-white/5 pt-3 mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-widest mr-1 font-mono">Roster Breakdown</span>
                          {Object.entries(teamDetail.playersByPosition)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([position, count]) => (
                              <div
                                key={position}
                                className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase tracking-wider ${getPositionColor(position)}`}
                              >
                                {position}: {count}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
