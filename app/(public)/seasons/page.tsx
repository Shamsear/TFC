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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      <main className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 border-b border-white/5 pb-6">
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
              SEASONS
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
              Browse all seasons and active rosters
            </p>
          </div>

          {/* Seasons Grid */}
          {seasons.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-dark-100 border border-white/5 shadow-md">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2 uppercase tracking-wide">No Seasons Found</h3>
              <p className="text-sm text-gray-400">Seasons will appear here once they are created</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/seasons/${season.id}`}
                  className="group rounded-2xl bg-dark-100 border border-white/5 p-6 hover:border-[#E8A800]/30 hover:bg-dark-200 transition-all shadow-md hover:shadow-neon-glow duration-300 flex flex-col justify-between"
                >
                  {/* Season Header */}
                  <div>
                    <div className="mb-5">
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#E8A800] transition-colors line-clamp-1">
                          {season.name}
                        </h3>
                        {season.isActive && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md shadow-emerald-950/10 flex-shrink-0 animate-pulse">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Active</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider font-mono">
                        Starting Purse: <span className="font-bold text-[#E8A800]">£{season.startingPurse.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
                      <div className="text-center p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-lg font-black text-blue-400 font-mono">{season.stats.totalTeams}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Teams</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-lg font-black text-[#FFB347] font-mono">{season.stats.totalPlayers}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Players</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-black/40 border border-white/5">
                        <div className="text-lg font-black text-[#E8A800] font-mono">{season.stats.totalTournaments}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Tourneys</div>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <div>
                          <div className="text-sm font-black text-white font-mono">{season.stats.totalMatches}</div>
                          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Matches</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <svg className="w-4 h-4 text-[#ff6600] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <div>
                          <div className="text-sm font-black text-white font-mono">{season.stats.totalGoals}</div>
                          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider font-mono">Goals</div>
                        </div>
                      </div>
                    </div>

                    {/* Total Spent */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-[#E8A800]/10 to-[#FFB347]/10 border border-[#E8A800]/20 mb-4 shadow-sm shadow-[#E8A800]/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4.5 h-4.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider font-mono">Total Spent</span>
                      </div>
                      <span className="text-base font-black text-[#E8A800] font-mono">£{season.stats.totalSpent.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* View Link */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#E8A800] group-hover:text-[#FFB347] transition-colors">
                      View Season Details
                    </span>
                    <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 group-hover:text-[#FFB347] transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
