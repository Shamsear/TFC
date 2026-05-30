import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getTournamentsData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { tournaments: [], seasonName: null, stats: { totalTournaments: 0, totalMatches: 0, completedMatches: 0 } }
    }

    // Get all tournaments with match counts
    const tournaments = await prisma.tournaments.findMany({
      where: { seasonId: activeSeason.id },
      include: {
        season: true,
        _count: {
          select: { matches: true }
        }
      },
      orderBy: { startDate: 'desc' }
    })

    // Get match statistics for each tournament
    const tournamentsWithStats = await Promise.all(
      tournaments.map(async (tournament) => {
        const completedMatches = await prisma.matches.count({
          where: {
            tournamentId: tournament.id,
            status: 'COMPLETED'
          }
        })

        const liveMatches = await prisma.matches.count({
          where: {
            tournamentId: tournament.id,
            status: 'LIVE'
          }
        })

        return {
          ...tournament,
          completedMatches,
          liveMatches
        }
      })
    )

    const totalMatches = tournaments.reduce((sum, t) => sum + t._count.matches, 0)
    const totalCompleted = tournamentsWithStats.reduce((sum, t) => sum + t.completedMatches, 0)

    return {
      tournaments: tournamentsWithStats,
      seasonName: activeSeason.name,
      stats: {
        totalTournaments: tournaments.length,
        totalMatches,
        completedMatches: totalCompleted
      }
    }
  } catch (error) {
    console.error('Error fetching tournaments data:', error)
    return { tournaments: [], seasonName: null, stats: { totalTournaments: 0, totalMatches: 0, completedMatches: 0 } }
  }
}

export default async function TournamentsPage() {
  const data = await getTournamentsData()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTournamentStatus = (tournament: any) => {
    const now = new Date()
    const start = new Date(tournament.startDate)
    const end = tournament.endDate ? new Date(tournament.endDate) : null

    if (tournament.liveMatches > 0) {
      return { label: 'LIVE', color: 'bg-[#00ff88]/10 border-[#00ff88]/20 text-[#00ff88] shadow-md shadow-[#00ff88]/5 animate-pulse' }
    }
    if (end && now > end) {
      return { label: 'COMPLETED', color: 'bg-[#E8A800]/10 border-[#E8A800]/20 text-[#E8A800] shadow-md shadow-[#E8A800]/5' }
    }
    if (now >= start) {
      return { label: 'ONGOING', color: 'bg-[#ff6600]/10 border-[#ff6600]/20 text-[#ff6600] shadow-md shadow-[#ff6600]/5' }
    }
    return { label: 'UPCOMING', color: 'bg-white/5 border-white/5 text-gray-500 font-bold uppercase' }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Stats */}
          <div className="mb-12 border-b border-white/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
                  TOURNAMENTS
                </h1>
                <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  {data.seasonName ? `${data.seasonName}` : 'All tournaments'}
                </p>
              </div>
              
              {/* Inline Stats */}
              <div className="flex items-center gap-6 sm:gap-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.totalTournaments}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Tournaments</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.totalMatches}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Matches</div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-2xl sm:text-3xl font-black text-white">{data.stats.completedMatches}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest font-mono">Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tournaments Grid */}
          {data.tournaments.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-dark-100 border border-white/5 shadow-md">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 uppercase tracking-wide">No Tournaments Found</h3>
              <p className="text-sm sm:text-base text-gray-400">Tournaments will appear here once the season starts</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.tournaments.map((tournament) => {
                const status = getTournamentStatus(tournament)
                const progress = tournament._count.matches > 0 
                  ? (tournament.completedMatches / tournament._count.matches) * 100 
                  : 0

                return (
                  <Link
                    key={tournament.id}
                    href={`/tournaments/${tournament.id}`}
                    className="group rounded-2xl bg-dark-100 border border-white/5 p-5 sm:p-6 hover:border-[#E8A800]/30 hover:bg-dark-200 transition-all shadow-md hover:shadow-neon-glow duration-300"
                  >
                    {/* Tournament Header */}
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-white/5 border-white/5 text-gray-400">
                          {tournament.tournamentType.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-xl font-black text-white mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-2">
                        {tournament.name}
                      </h3>
                      <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">
                        {formatDate(tournament.startDate)}
                        {tournament.endDate && ` - ${formatDate(tournament.endDate)}`}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-400 font-medium">Total Matches</span>
                        <span className="text-white font-black">{tournament._count.matches}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-400 font-medium">Completed</span>
                        <span className="text-[#E8A800] font-black">{tournament.completedMatches}</span>
                      </div>
                      {tournament.liveMatches > 0 && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-gray-400 font-medium">Live Now</span>
                          <span className="text-[#00ff88] font-black flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping"></span>
                            {tournament.liveMatches}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {tournament._count.matches > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono mb-1.5">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#E8A800] to-[#FFB347] rounded-full transition-all shadow-[0_0_10px_rgba(232,168,0,0.5)]"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* View Link */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/5">
                      <span className="text-xs font-black uppercase tracking-wider text-[#E8A800] group-hover:text-[#FFB347] transition-colors">
                        View Matches
                      </span>
                      <svg className="w-3.5 h-3.5 text-[#E8A800] group-hover:translate-x-1 group-hover:text-[#FFB347] transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
