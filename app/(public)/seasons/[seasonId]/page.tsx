import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getSeasonData(seasonId: string) {
  try {
    const season = await prisma.seasons.findUnique({
      where: { id: seasonId },
      include: {
        seasonTeams: {
          include: {
            team: true
          }
        },
        tournaments: true,
        transferHistory: true,
        seasonalPlayerStats: true
      }
    })

    if (!season) return null

    // Get match statistics
    const allMatches = await prisma.matches.findMany({
      where: {
        tournament: {
          seasonId: seasonId
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
      season,
      stats: {
        totalTeams: season.seasonTeams.length,
        totalPlayers: season.seasonalPlayerStats.length,
        totalTournaments: season.tournaments.length,
        totalMatches: allMatches.length, // Total matches, not just completed
        totalGoals,
        totalSpent,
        startingPurse: season.startingPurse
      }
    }
  } catch (error) {
    console.error('Error fetching season data:', error)
    return null
  }
}

export default async function SeasonPage({
  params
}: {
  params: Promise<{ seasonId: string }>
}) {
  const { seasonId } = await params
  const data = await getSeasonData(seasonId)

  if (!data) {
    notFound()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    return `$${(amount / 1000).toFixed(0)}K`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PublicHeader />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section with Gradient Background */}
          <div className="relative mb-8 sm:mb-12 rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#E8A800] via-[#FFB347] to-[#FFC93A] opacity-10"></div>
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5"></div>
            
            {/* Content */}
            <div className="relative p-6 sm:p-10 lg:p-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                <div className="flex-1">
                  {/* Badge */}
                  {data.season.isActive && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8A800]/20 border border-[#E8A800]/30 backdrop-blur-sm mb-4">
                      <span className="w-2 h-2 bg-[#E8A800] rounded-full animate-pulse"></span>
                      <span className="text-xs font-bold text-[#E8A800] uppercase tracking-wider">Active Season</span>
                    </div>
                  )}
                  
                  {/* Title */}
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#F5F0E8] mb-3 sm:mb-4 leading-tight">
                    {data.season.name}
                  </h1>
                  
                  {/* Starting Purse */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E8A800]/10 border border-[#E8A800]/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Starting Purse</div>
                      <div className="text-xl sm:text-2xl font-black text-[#E8A800]">{formatCurrency(data.stats.startingPurse)}</div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center p-4 rounded-xl bg-[#111111]/50 border border-white/10 backdrop-blur-sm">
                    <div className="text-2xl sm:text-3xl font-black text-[#E8A800]">{data.stats.totalTeams}</div>
                    <div className="text-xs text-[#7A7367] uppercase tracking-wider mt-1">Teams</div>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-[#111111]/50 border border-white/10 backdrop-blur-sm">
                    <div className="text-2xl sm:text-3xl font-black text-[#FFB347]">{data.stats.totalTournaments}</div>
                    <div className="text-xs text-[#7A7367] uppercase tracking-wider mt-1">Tournaments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview - Unified Gold Theme */}
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-black text-[#F5F0E8] mb-4 sm:mb-6 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-[#E8A800] to-[#FFB347] rounded-full"></div>
              Season Statistics
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Players */}
              <div className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-[#E8A800]/20 p-4 sm:p-6 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#E8A800]/20 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1">{data.stats.totalPlayers}</div>
                <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Players</div>
              </div>

              {/* Matches */}
              <div className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-[#FFB347]/20 p-4 sm:p-6 hover:border-[#FFB347]/40 hover:bg-[#FFB347]/5 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFB347]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#FFB347]/20 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1">{data.stats.totalMatches}</div>
                <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Matches</div>
              </div>

              {/* Goals */}
              <div className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-[#FFC93A]/20 p-4 sm:p-6 hover:border-[#FFC93A]/40 hover:bg-[#FFC93A]/5 transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFC93A]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#FFC93A]/20 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFC93A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1">{data.stats.totalGoals}</div>
                <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Goals</div>
              </div>

              {/* Total Spent */}
              <div className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-[#E8A800]/20 p-4 sm:p-6 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5 transition-all col-span-2 sm:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#E8A800]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#E8A800]/20 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1">{formatCurrency(data.stats.totalSpent)}</div>
                <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Total Spent</div>
              </div>

              {/* Average per Team */}
              <div className="group rounded-xl sm:rounded-2xl bg-[#111111] border border-[#FFB347]/20 p-4 sm:p-6 hover:border-[#FFB347]/40 hover:bg-[#FFB347]/5 transition-all col-span-2 sm:col-span-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFB347]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[#FFB347]/20 transition-colors">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#F5F0E8] mb-1">
                  {formatCurrency(data.stats.totalTeams > 0 ? data.stats.totalSpent / data.stats.totalTeams : 0)}
                </div>
                <div className="text-xs text-[#7A7367] uppercase tracking-wider font-medium">Avg per Team</div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Redesigned */}
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-black text-[#F5F0E8] mb-4 sm:mb-6 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-[#E8A800] to-[#FFB347] rounded-full"></div>
              Quick Access
            </h2>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {/* View Teams - Primary Action */}
              <Link
                href={`/seasons/${seasonId}/teams`}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#E8A800] to-[#FFB347] p-6 sm:p-7 hover:scale-[1.02] transition-all shadow-lg hover:shadow-[#E8A800]/30"
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10"></div>
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-black/10 flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#0a0a0a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <svg className="w-5 h-5 text-[#0a0a0a]/60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#0a0a0a] mb-2">View Teams</h3>
                  <p className="text-sm text-[#0a0a0a]/70 font-medium">Explore all {data.stats.totalTeams} teams competing this season</p>
                </div>
              </Link>

              {/* Calendar */}
              <Link
                href="/calendar"
                className="group rounded-2xl bg-[#111111] border border-[#E8A800]/20 p-6 sm:p-7 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#E8A800]/10 flex items-center justify-center group-hover:bg-[#E8A800]/20 transition-colors">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-[#7A7367] group-hover:text-[#E8A800] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#F5F0E8] mb-2 group-hover:text-[#E8A800] transition-colors">Calendar</h3>
                <p className="text-sm text-[#7A7367] font-medium">View upcoming matches and events</p>
              </Link>

              {/* Players */}
              <Link
                href="/players"
                className="group rounded-2xl bg-[#111111] border border-[#FFB347]/20 p-6 sm:p-7 hover:border-[#FFB347]/40 hover:bg-[#FFB347]/5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#FFB347]/10 flex items-center justify-center group-hover:bg-[#FFB347]/20 transition-colors">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#FFB347]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <svg className="w-5 h-5 text-[#7A7367] group-hover:text-[#FFB347] group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#F5F0E8] mb-2 group-hover:text-[#FFB347] transition-colors">Players</h3>
                <p className="text-sm text-[#7A7367] font-medium">Browse {data.stats.totalPlayers} registered players</p>
              </Link>
            </div>
          </div>

          {/* Tournaments List - Redesigned */}
          {data.season.tournaments.length > 0 && (
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#F5F0E8] mb-4 sm:mb-6 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-[#E8A800] to-[#FFB347] rounded-full"></div>
                Tournaments
              </h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {data.season.tournaments.map((tournament) => (
                  <Link
                    key={tournament.id}
                    href={`/tournaments/${tournament.id}`}
                    className="group rounded-2xl bg-[#111111] border border-[#E8A800]/20 p-5 sm:p-6 hover:border-[#E8A800]/40 hover:bg-[#E8A800]/5 transition-all"
                  >
                    {/* Tournament Type Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/20">
                        <svg className="w-3.5 h-3.5 text-[#E8A800]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <span className="text-xs font-bold text-[#E8A800] uppercase tracking-wider">
                          {tournament.tournamentType.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        tournament.status === 'IN_PROGRESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        tournament.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-[#7A7367]/10 text-[#7A7367] border border-[#7A7367]/20'
                      }`}>
                        {tournament.status === 'IN_PROGRESS' ? 'Live' : 
                         tournament.status === 'COMPLETED' ? 'Done' : 'Soon'}
                      </div>
                    </div>

                    {/* Tournament Name */}
                    <h3 className="text-lg sm:text-xl font-black text-[#F5F0E8] mb-3 group-hover:text-[#E8A800] transition-colors line-clamp-2">
                      {tournament.name}
                    </h3>

                    {/* Tournament Dates */}
                    {tournament.startDate && (
                      <div className="flex items-center gap-2 text-xs text-[#7A7367] mb-4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-medium">
                          {new Date(tournament.startDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}

                    {/* View Link */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-sm font-bold text-[#E8A800] group-hover:text-[#FFC93A] transition-colors">
                        View Details
                      </span>
                      <svg className="w-4 h-4 text-[#E8A800] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
