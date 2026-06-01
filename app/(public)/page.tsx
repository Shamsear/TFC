import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { AuthRedirect } from '@/components/AuthRedirect'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

// Force dynamic rendering to avoid stale cache
export const dynamic = 'force-dynamic'

async function getLandingPageData() {
  try {
    // Get active season
    const activeSeason = await prisma.seasons.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true
      }
    })

    const seasonId = activeSeason?.id

    // Fetch stats counters
    const [teamsCount, playersCount, matchesCount, seasonsCount] = await Promise.all([
      seasonId 
        ? prisma.season_teams.count({ where: { seasonId } })
        : prisma.season_teams.count(),
      seasonId 
        ? prisma.seasonal_player_stats.count({ where: { seasonId } })
        : prisma.seasonal_player_stats.count(),
      seasonId 
        ? prisma.matches.count({ where: { tournament: { seasonId } } })
        : prisma.matches.count(),
      prisma.seasons.count()
    ])

    // Get recent transfers with serializable data only
    const transfersRaw = seasonId 
      ? await prisma.transfer_history.findMany({
          where: { seasonId, status: 'ACTIVE' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            soldPrice: true,
            basePlayer: {
              select: {
                name: true
              }
            },
            team: {
              select: {
                name: true
              }
            },
            season: {
              select: {
                name: true
              }
            }
          }
        })
      : await prisma.transfer_history.findMany({
          where: { status: 'ACTIVE' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            soldPrice: true,
            basePlayer: {
              select: {
                name: true
              }
            },
            team: {
              select: {
                name: true
              }
            },
            season: {
              select: {
                name: true
              }
            }
          }
        })

    // Convert to plain objects
    const recentTransfers = transfersRaw.map(transfer => ({
      id: transfer.id,
      soldPrice: Number(transfer.soldPrice),
      basePlayer: {
        name: transfer.basePlayer.name
      },
      team: {
        name: transfer.team.name
      },
      season: {
        name: transfer.season.name
      }
    }))

    return {
      activeSeason: activeSeason ? {
        id: activeSeason.id,
        name: activeSeason.name
      } : null,
      stats: {
        teams: teamsCount,
        players: playersCount,
        matches: matchesCount,
        seasons: seasonsCount
      },
      recentTransfers
    }
  } catch (error) {
    console.error('Error fetching landing page data:', error)
    return {
      activeSeason: null,
      stats: { teams: 0, players: 0, matches: 0, seasons: 0 },
      recentTransfers: []
    }
  }
}

export default async function PublicLandingPage() {
  // Server-side authentication check and redirect
  const session = await auth()
  
  if (session?.user) {
    const role = session.user.role
    
    if (role === 'SUPER_ADMIN') {
      redirect('/super-admin')
    } else if (role === 'SUB_ADMIN') {
      redirect('/sub-admin')
    } else if (role === 'TEAM_MANAGER') {
      redirect('/team')
    }
  }

  const data = await getLandingPageData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-26 pb-24 sm:pt-40 sm:pb-32">
          {/* Neon Hero Spotlights */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E8A800]/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff6600]/5 rounded-full blur-[120px]"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {data.activeSeason && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/20 mb-8 shadow-[0_0_15px_rgba(232,168,0,0.15)] animate-pulse">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8A800] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8A800]"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#E8A800] font-mono">
                    {data.activeSeason.name.toUpperCase()} LIVE
                  </span>
                </div>
              )}

              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 leading-tight select-none">
                Turf Cats
                <br />
                <span className="bg-gradient-to-r from-[#E8A800] via-[#FFD066] to-[#FFB347] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(232,168,0,0.15)]">
                  eFootball League
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed font-semibold">
                The ultimate battleground for the squad. Strategize player retentions, execute live auction bids, and track real-time match fixtures.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/teams"
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#E8A800] to-[#FFB347] text-black rounded-xl font-black uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(232,168,0,0.35)] hover:shadow-[0_0_25px_rgba(255,179,71,0.5)] text-center cursor-pointer"
                >
                  View Teams
                </Link>
                <Link
                  href="/players"
                  className="w-full sm:w-auto px-8 py-4 bg-dark-100 border border-white/5 hover:border-[#E8A800]/30 hover:bg-dark-200 text-gray-300 hover:text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 text-center cursor-pointer"
                >
                  Browse Players
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-white/5 bg-black/40 backdrop-blur-md relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group">
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 transition-transform group-hover:scale-105 duration-300 drop-shadow-[0_0_10px_rgba(232,168,0,0.25)]">
                  {data.stats.teams}
                </div>
                <div className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  Active Teams
                </div>
              </div>
              <div className="text-center group">
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 transition-transform group-hover:scale-105 duration-300 drop-shadow-[0_0_10px_rgba(255,179,71,0.25)]">
                  {data.stats.players}
                </div>
                <div className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  Total Players
                </div>
              </div>
              <div className="text-center group">
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 transition-transform group-hover:scale-105 duration-300 drop-shadow-[0_0_10px_rgba(232,168,0,0.25)]">
                  {data.stats.matches}
                </div>
                <div className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  Matches Played
                </div>
              </div>
              <div className="text-center group">
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 transition-transform group-hover:scale-105 duration-300 drop-shadow-[0_0_10px_rgba(255,179,71,0.25)]">
                  {data.stats.seasons}
                </div>
                <div className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
                  Seasons
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent leading-none">
                WHAT WE TRACK
              </h2>
              <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono mt-2">
                Immersive Roster & League Administration Platform
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: 'Live Auctions',
                  description: 'Real-time bidding with instant budget updates during auction nights.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(232,168,0,0.3)] hover:border-[#E8A800]/30',
                  accent: 'text-[#E8A800] bg-[#E8A800]/10 border-[#E8A800]/20'
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  title: 'Team Squads',
                  description: 'Complete rosters with player stats and transfer history for every team.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:border-[#FFB347]/30',
                  accent: 'text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/20'
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                  title: 'Player Database',
                  description: 'Every player with detailed stats and complete transfer records.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(232,168,0,0.3)] hover:border-[#E8A800]/30',
                  accent: 'text-[#E8A800] bg-[#E8A800]/10 border-[#E8A800]/20'
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  ),
                  title: 'Tournaments',
                  description: 'Fixtures, standings, and results for all league tournaments.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:border-[#FFB347]/30',
                  accent: 'text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/20'
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: 'Budget Tracking',
                  description: 'Real-time budget calculations and financial history for each team.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(232,168,0,0.3)] hover:border-[#E8A800]/30',
                  accent: 'text-[#E8A800] bg-[#E8A800]/10 border-[#E8A800]/20'
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                  title: 'Retention System',
                  description: 'Pre-season player retention before each auction round.',
                  shadow: 'hover:shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:border-[#FFB347]/30',
                  accent: 'text-[#FFB347] bg-[#FFB347]/10 border-[#FFB347]/20'
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`p-8 rounded-2xl bg-dark-100 border border-white/5 transition-all duration-300 group shadow-lg ${feature.shadow}`}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border mb-5 group-hover:scale-110 transition-transform duration-300 ${feature.accent}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed text-sm font-medium">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Transfers */}
        {data.recentTransfers.length > 0 && (
          <section className="py-24 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-black/20 relative overflow-hidden">
            {/* Spotlights */}
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#ff6600]/[0.01] rounded-full blur-[80px] pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent leading-none">
                    RECENT TRANSFERS
                  </h2>
                  <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono mt-2">
                    Real-time ledger updates from active bidding rounds
                  </p>
                </div>
                <Link
                  href="/players"
                  className="hidden sm:flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#E8A800] hover:text-[#FFB347] transition-colors cursor-pointer group"
                >
                  View All
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              <div className="space-y-3">
                {data.recentTransfers.slice(0, 5).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-5 rounded-2xl bg-dark-100 border border-white/5 hover:border-[#E8A800]/20 hover:bg-dark-200 transition-all shadow-md group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-[#E8A800]/10 rounded-xl flex items-center justify-center text-[#E8A800] font-black text-xs border border-[#E8A800]/20 group-hover:scale-105 transition-transform duration-300">
                        {transfer.basePlayer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-bold mb-1 group-hover:text-[#E8A800] transition-colors">
                          {transfer.basePlayer.name}
                        </div>
                        <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider font-mono">
                          {transfer.team.name} • {transfer.season.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400 font-mono font-black text-sm">
                        ${(transfer.soldPrice / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
