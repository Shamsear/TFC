import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getSeasonsData() {
  try {
    const seasons = await prisma.seasons.findMany({
      include: {
        seasonTeams: {
          include: {
            team: true
          }
        },
        tournaments: true,
        transferHistory: true,
        seasonalPlayerStats: true
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Calculate stats for each season
    const seasonsWithStats = await Promise.all(
      seasons.map(async (season) => {
        // Get match statistics
        const allMatches = await prisma.matches.findMany({
          where: {
            tournament: {
              seasonId: season.id
            }
          }
        })

        const completedMatches = allMatches.filter(m => m.status === 'COMPLETED')
        const totalGoals = completedMatches
          .filter(m => m.homeScore !== null && m.awayScore !== null)
          .reduce((sum, m) => sum + m.homeScore! + m.awayScore!, 0)

        // Calculate total spent
        const totalSpent = season.transferHistory.reduce((sum, t) => sum + t.soldPrice, 0)

        return {
          ...season,
          stats: {
            totalTeams: season.seasonTeams.length,
            totalPlayers: season.seasonalPlayerStats.length,
            totalTournaments: season.tournaments.length,
            totalMatches: allMatches.length, // Total matches, not just completed
            totalGoals,
            totalSpent
          }
        }
      })
    )

    return seasonsWithStats
  } catch (error) {
    console.error('Error fetching seasons data:', error)
    return []
  }
}

export default async function SeasonsPage() {
  const seasons = await getSeasonsData()

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    return `${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-10">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-[#FFB347] uppercase">All Seasons</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#F5F0E8] mb-2 sm:mb-3">Seasons</h1>
            <p className="text-sm sm:text-base text-[#D4CCBB]">
              Browse all seasons and their statistics
            </p>
          </div>

          {/* Seasons Grid */}
          {seasons.length === 0 ? (
            <div className="text-center py-12 sm:py-16 rounded-xl bg-white/[0.02] border border-white/10">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-[#7A7367] mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-[#F5F0E8] mb-2">No Seasons Found</h3>
              <p className="text-sm sm:text-base text-[#D4CCBB]">Seasons will appear here once they are created</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/seasons/${season.id}`}
                  className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-white/10 p-5 sm:p-7 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
                >
                  {/* Season Header */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h3 className="text-xl sm:text-2xl font-black text-[#F5F0E8] group-hover:text-[#E8A800] transition-colors">
                        {season.name}
                      </h3>
                      {season.isActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                          <span className="text-xs font-bold text-emerald-400 uppercase">Active</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-[#7A7367]">
                      Starting Purse: <span className="font-bold text-[#E8A800]">{formatCurrency(season.startingPurse)}</span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="text-center p-2.5 sm:p-3 rounded-lg bg-white/5">
                      <div className="text-lg sm:text-xl font-black text-blue-400">{season.stats.totalTeams}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase">Teams</div>
                    </div>
                    <div className="text-center p-2.5 sm:p-3 rounded-lg bg-white/5">
                      <div className="text-lg sm:text-xl font-black text-purple-400">{season.stats.totalPlayers}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase">Players</div>
                    </div>
                    <div className="text-center p-2.5 sm:p-3 rounded-lg bg-white/5">
                      <div className="text-lg sm:text-xl font-black text-[#E8A800]">{season.stats.totalTournaments}</div>
                      <div className="text-[10px] sm:text-xs text-[#7A7367] uppercase">Tournaments</div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-white/5">
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-[#F5F0E8]">{season.stats.totalMatches}</div>
                        <div className="text-[10px] text-[#7A7367]">Matches</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-lg bg-white/5">
                      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-[#F5F0E8]">{season.stats.totalGoals}</div>
                        <div className="text-[10px] text-[#7A7367]">Goals</div>
                      </div>
                    </div>
                  </div>

                  {/* Total Spent */}
                  <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 mb-4 sm:mb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs sm:text-sm text-[#D4CCBB]">Total Spent</span>
                      </div>
                      <span className="text-base sm:text-lg font-black text-[#E8A800]">{formatCurrency(season.stats.totalSpent)}</span>
                    </div>
                  </div>

                  {/* View Link */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <span className="text-xs sm:text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                      View Season Details
                    </span>
                    <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
