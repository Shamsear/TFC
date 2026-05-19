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
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
          LIVE
        </span>
      )
    case 'completed':
      return (
        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
          COMPLETED
        </span>
      )
    case 'draft':
      return (
        <span className="px-3 py-1 rounded-full bg-[#FFB347]/20 text-[#FFB347] text-xs font-bold border border-[#FFB347]/30">
          UPCOMING
        </span>
      )
    default:
      return (
        <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs font-bold border border-gray-500/30">
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Auction Rounds
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              {data.seasonName ? `${data.seasonName} — View all auction rounds and results` : 'Browse auction rounds'}
            </p>
          </div>

          {/* Stats */}
          {data.stats.total > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Total Rounds</div>
                <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.total}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Active</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">{data.stats.active}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="text-xs sm:text-sm text-gray-400 mb-1 font-medium">Completed</div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400">{data.stats.completed}</div>
              </div>
            </div>
          )}

          {/* Rounds List */}
          {data.rounds.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">No Auction Rounds</h3>
              <p className="text-gray-400">Auction rounds will appear here once they are created</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.rounds.map((round) => {
                const timeRemaining = round.endTime ? new Date(round.endTime).getTime() - Date.now() : 0
                const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
                const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))
                const isActive = round.status === 'active'
                const isUrgent = isActive && hoursRemaining < 2

                return (
                  <Link
                    key={round.id}
                    href={`/auctions/rounds/${round.id}`}
                    className="block rounded-xl bg-white/5 border border-white/10 hover:border-[#E8A800]/50 hover:bg-white/[0.07] transition-all p-4 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl sm:text-2xl font-black text-white">
                            Round {round.roundNumber}
                          </h3>
                          {getRoundStatusBadge(round.status)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                          <span className="font-medium">{round.position || 'All Positions'}</span>
                          <span className="text-gray-600">•</span>
                          <span>{getRoundTypeLabel(round.roundType)}</span>
                          {round.roundType === 'bulk' && round.maxBidsPerTeam && (
                            <>
                              <span className="text-gray-600">•</span>
                              <span>{round.maxBidsPerTeam} selections per team</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isActive && round.endTime && (
                        <div className="text-right">
                          <div className={`text-xl sm:text-2xl font-black ${isUrgent ? 'text-red-400' : 'text-[#FFB347]'}`}>
                            {hoursRemaining > 0 && `${hoursRemaining}h `}
                            {minutesRemaining}m
                          </div>
                          <div className="text-xs text-gray-400">remaining</div>
                        </div>
                      )}
                    </div>

                    {round.startTime && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-gray-400">
                          Started: {new Date(round.startTime).toLocaleDateString()} at {new Date(round.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[#E8A800] font-medium inline-flex items-center gap-1">
                          View Details
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}

          {/* View Results Link */}
          {data.seasonId && data.stats.completed > 0 && (
            <div className="mt-8 text-center">
              <Link
                href={`/auctions/results`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#E8A800] to-[#FFB347] hover:from-[#FFC93A] hover:to-[#FFB347] text-[#0a0a0a] rounded-xl font-bold transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
