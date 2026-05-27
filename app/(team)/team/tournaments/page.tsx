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
      return { label: 'LIVE', color: 'bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]' }
    }
    if (end && now > end) {
      return { label: 'COMPLETED', color: 'bg-[#E8A800]/10 border-[#E8A800]/30 text-[#E8A800]' }
    }
    if (now >= start) {
      return { label: 'ONGOING', color: 'bg-[#FFC93A]/10 border-[#FFC93A]/30 text-[#FFC93A]' }
    }
    return { label: 'UPCOMING', color: 'bg-white/5 border-white/20 text-[#D4CCBB]' }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header with Stats */}
          <div className="mb-6 sm:mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-[#F5F0E8] mb-1 sm:mb-2">Tournaments</h1>
                <p className="text-sm sm:text-base text-[#D4CCBB]">
                  {data.seasonName ? `${data.seasonName}` : 'All tournaments'}
                </p>
              </div>
              
              {/* Inline Stats */}
              <div className="flex items-center gap-4 sm:gap-8">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalTournaments}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Tournaments</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.totalMatches}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Matches</div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8]">{data.stats.completedMatches}</div>
                  <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase tracking-wider">Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tournaments Grid */}
          {data.tournaments.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Tournaments Found</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">Tournaments will appear here once the season starts</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {data.tournaments.map((tournament) => {
                const status = getTournamentStatus(tournament)
                const progress = tournament._count.matches > 0 
                  ? (tournament.completedMatches / tournament._count.matches) * 100 
                  : 0

                return (
                  <Link
                    key={tournament.id}
                    href={`/team/tournaments/${tournament.id}`}
                    className="group rounded-xl bg-[#111111] border border-white/10 p-4 sm:p-6 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
                  >
                    {/* Tournament Header */}
                    <div className="mb-3 sm:mb-5">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-bold bg-[#FFB347]/10 border-[#FFB347]/30 text-[#FFB347]">
                          {tournament.tournamentType.replace('_', ' ')}
                        </span>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border text-[10px] sm:text-xs font-bold ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-xl font-black text-[#F5F0E8] mb-1 group-hover:text-[#E8A800] transition-colors line-clamp-2">
                        {tournament.name}
                      </h3>
                      <div className="text-xs sm:text-sm text-[#7A7367]">
                        {formatDate(tournament.startDate)}
                        {tournament.endDate && ` - ${formatDate(tournament.endDate)}`}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[#D4CCBB]">Total Matches</span>
                        <span className="text-[#F5F0E8] font-bold">{tournament._count.matches}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[#D4CCBB]">Completed</span>
                        <span className="text-[#E8A800] font-bold">{tournament.completedMatches}</span>
                      </div>
                      {tournament.liveMatches > 0 && (
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-[#D4CCBB]">Live Now</span>
                          <span className="text-[#FFB347] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB347] animate-pulse"></span>
                            {tournament.liveMatches}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {tournament._count.matches > 0 && (
                      <div className="mb-3 sm:mb-5">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-[#7A7367] mb-1.5">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 sm:h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#FFC93A] to-[#E8A800] rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* View Link */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-white/10">
                      <span className="text-xs sm:text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                        View Matches
                      </span>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
