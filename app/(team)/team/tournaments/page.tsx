import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getTournamentsData(teamId: string) {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true }
    })

    if (!activeSeason) {
      return { tournaments: [], seasonName: null, stats: { totalTournaments: 0, totalMatches: 0, completedMatches: 0 } }
    }

    // Get all tournaments in the active season
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

    // Get match statistics for all tournaments
    const [completedMatches, liveMatches] = await Promise.all([
      prisma.matches.groupBy({
        by: ['tournamentId'],
        where: { status: 'COMPLETED' },
        _count: { _all: true }
      }),
      prisma.matches.groupBy({
        by: ['tournamentId'],
        where: { status: 'LIVE' },
        _count: { _all: true }
      })
    ])

    const completedMap = new Map(completedMatches.map(m => [m.tournamentId, m._count._all]))
    const liveMap = new Map(liveMatches.map(m => [m.tournamentId, m._count._all]))

    const tournamentsWithStats = tournaments.map(tournament => {
      return {
        ...tournament,
        completedMatches: completedMap.get(tournament.id) || 0,
        liveMatches: liveMap.get(tournament.id) || 0
      }
    })

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

export default async function TeamTournamentsPage() {
  const session = await auth()
  
  if (!session?.user || session.user.role !== 'TEAM_MANAGER') {
    redirect('/auth/signin')
  }

  const data = await getTournamentsData(session.user.id)

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
      return { label: 'LIVE', color: 'bg-red-500/15 border-red-500/35 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.25)] animate-pulse' }
    }
    if (end && now > end) {
      return { label: 'COMPLETED', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' }
    }
    if (now >= start) {
      return { label: 'ONGOING', color: 'bg-[#FFC93A]/10 border-[#FFC93A]/30 text-[#FFC93A]' }
    }
    return { label: 'UPCOMING', color: 'bg-white/5 border border-white/10 text-gray-400' }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
      {/* Background radial blurs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-80 right-20 w-80 h-80 bg-[#E8A800]/[0.02] rounded-full blur-3xl pointer-events-none" />

      <main className="pt-24 pb-16 px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">Tournaments Portal</h1>
            <p className="text-sm text-[#D4CCBB] font-medium uppercase tracking-wider">
              {data.seasonName ? `${data.seasonName} active calendar` : 'All tournaments pool'}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl bg-white/[0.01] border border-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-lg">
              <div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">Total Tournaments</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{data.stats.totalTournaments}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center text-[#E8A800] text-lg shadow-[0_0_10px_rgba(232,168,0,0.1)]">🏆</div>
            </div>
            <div className="rounded-xl bg-white/[0.01] border border-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-lg">
              <div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">Total Matches</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{data.stats.totalMatches}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-lg shadow-[0_0_10px_rgba(59,130,246,0.1)]">⚽</div>
            </div>
            <div className="rounded-xl bg-white/[0.01] border border-white/5 p-4 backdrop-blur-md flex items-center justify-between shadow-lg">
              <div>
                <div className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">Completed Matches</div>
                <div className="text-2xl sm:text-3xl font-black text-[#E8A800] mt-1 drop-shadow-[0_0_8px_rgba(232,168,0,0.15)]">{data.stats.completedMatches}</div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg shadow-[0_0_10px_rgba(16,185,129,0.1)]">✅</div>
            </div>
          </div>

          {/* Tournaments Grid */}
          {data.tournaments.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Active Tournaments Found</h3>
              <p className="text-sm text-gray-400">Tournaments will appear here once the season fixtures are generated</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {data.tournaments.map((tournament) => {
                const status = getTournamentStatus(tournament)
                const progress = tournament._count.matches > 0 
                  ? (tournament.completedMatches / tournament._count.matches) * 100 
                  : 0

                return (
                  <Link
                    key={tournament.id}
                    href={`/team/tournaments/${tournament.id}`}
                    className="group rounded-2xl bg-white/[0.01] border border-white/10 hover:border-[#E8A800]/30 hover:bg-white/[0.05] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 relative backdrop-blur-md shadow-xl flex flex-col justify-between min-h-[260px]"
                  >
                    {/* Tournament Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                          {tournament.tournamentType.replace('_', ' ')}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white mb-1.5 group-hover:text-[#E8A800] transition-colors line-clamp-2 leading-snug">
                        {tournament.name}
                      </h3>
                      <div className="text-xs text-[#7A7367] font-semibold">
                        {formatDate(tournament.startDate)}
                        {tournament.endDate && ` - ${formatDate(tournament.endDate)}`}
                      </div>
                    </div>

                    {/* Stats & Progress */}
                    <div className="mt-4">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-400">Total Matches</span>
                          <span className="text-white font-bold">{tournament._count.matches}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-gray-400">Completed</span>
                          <span className="text-[#E8A800] font-bold">{tournament.completedMatches}</span>
                        </div>
                        {tournament.liveMatches > 0 && (
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-gray-400">Live Now</span>
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                              {tournament.liveMatches}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {tournament._count.matches > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mb-1.5">
                            <span>PROGRESS</span>
                            <span>{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-[#E8A800] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* View Link */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-xs sm:text-sm font-black text-[#E8A800] group-hover:text-[#FFC93A] transition-colors uppercase tracking-wider">
                        View Matches
                      </span>
                      <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
