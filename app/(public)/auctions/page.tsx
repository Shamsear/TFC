import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getAuctionsData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { rounds: [], seasonName: null, stats: { total: 0, active: 0, completed: 0 } }
    }

    // Get all rounds for this season
    const rounds = await prisma.rounds.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        _count: {
          select: {
            teamRoundBids: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Active first
        { roundNumber: 'desc' } // Most recent first
      ]
    })

    // Calculate stats
    const stats = {
      total: rounds.length,
      active: rounds.filter(r => r.status === 'active').length,
      completed: rounds.filter(r => r.status === 'completed').length
    }

    return {
      rounds,
      seasonName: activeSeason.name,
      seasonId: activeSeason.id,
      stats
    }
  } catch (error) {
    console.error('Error fetching auctions data:', error)
    return { rounds: [], seasonName: null, seasonId: null, stats: { total: 0, active: 0, completed: 0 } }
  }
}

const getRoundStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return (
        <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88] shadow-md shadow-[#00ff88]/5 flex items-center gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-ping"></span>
          LIVE
        </span>
      )
    case 'completed':
      return (
        <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800] shadow-md shadow-[#E8A800]/5">
          COMPLETED
        </span>
      )
    case 'draft':
      return (
        <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-[#ff6600]/10 border-[#ff6600]/20 text-[#ff6600] shadow-md shadow-[#ff6600]/5">
          UPCOMING
        </span>
      )
    default:
      return (
        <span className="px-3 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider bg-white/5 border-white/5 text-gray-500 font-bold">
          {status.toUpperCase()}
        </span>
      )
  }
}

const getRoundTypeLabel = (roundType: string) => {
  switch (roundType) {
    case 'normal':
      return 'Normal Round'
    case 'bulk':
      return 'Bulk Round'
    default:
      return roundType
  }
}

export default async function AuctionsPage() {
  const data = await getAuctionsData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 border-b border-white/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
                  AUCTION ROUNDS
                </h1>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  {data.seasonName ? `${data.seasonName} — View all active and completed rounds` : 'Browse auction rounds'}
                </p>
              </div>

              {/* Inline Stats */}
              {data.stats.total > 0 && (
                <div className="flex items-center gap-6 sm:gap-8">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.total}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Rounds</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#00ff88]">{data.stats.active}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">{data.stats.completed}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Completed</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rounds Grid / List */}
          {data.rounds.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-dark-100 border border-white/5 shadow-md">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 uppercase tracking-wide">No Auction Rounds</h3>
              <p className="text-sm text-gray-400">Auction rounds will appear here once they are created</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {data.rounds.map((round) => {
                const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
                const hoursRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60)))
                const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)))
                const isActive = round.status === 'active'
                const isUrgent = isActive && hoursRemaining < 2

                return (
                  <Link
                    key={round.id}
                    href={`/auctions/rounds/${round.id}`}
                    className="group rounded-2xl bg-dark-100 border border-white/5 p-5 sm:p-6 hover:border-[#E8A800]/30 hover:bg-dark-200 transition-all shadow-md hover:shadow-neon-glow duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#E8A800] transition-colors">
                              Round {round.roundNumber}
                            </h3>
                            {getRoundStatusBadge(round.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 font-medium">
                            <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[10px] font-black uppercase text-gray-400">
                              {round.position || 'All Positions'}
                            </span>
                            <span>•</span>
                            <span>{getRoundTypeLabel(round.roundType)}</span>
                            {round.roundType === 'bulk' && round.maxBidsPerTeam && (
                              <>
                                <span>•</span>
                                <span>{round.maxBidsPerTeam} selections/team</span>
                              </>
                            )}
                          </div>
                        </div>

                        {isActive && round.endTime && (
                          <div className="text-right">
                            <div className={`text-lg sm:text-xl font-mono font-black ${isUrgent ? 'text-red-400 animate-pulse' : 'text-[#E8A800]'}`}>
                              {hoursRemaining > 0 && `${hoursRemaining}h `}
                              {minutesRemaining}m
                            </div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">remaining</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                      <span className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                        {round.startTime && `Started: ${new Date(round.startTime).toLocaleDateString()}`}
                      </span>
                      <div className="text-xs font-black uppercase tracking-wider text-[#E8A800] group-hover:text-[#FFB347] transition-colors inline-flex items-center gap-1">
                        View Details
                        <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* View Results Link */}
          {data.seasonId && data.stats.completed > 0 && (
            <div className="mt-12 text-center">
              <Link
                href={`/auctions/results`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E8A800]/20 to-[#FFB347]/10 hover:from-[#E8A800]/30 hover:to-[#FFB347]/20 border border-[#E8A800]/30 text-[#E8A800] rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_4px_12px_rgba(232,168,0,0.1)] hover:scale-[1.02]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View All Auction Results
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
