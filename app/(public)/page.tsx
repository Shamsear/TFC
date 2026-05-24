import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getHomeData() {
  try {
    // Run queries in parallel for better performance
    const [activeSeason, totalPlayers, totalMatches, totalSeasons, recentTransfers] = await Promise.all([
      // Get active season with minimal data
      prisma.seasons.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: { seasonTeams: true }
          }
        }
      }),
      
      // Get total stats
      prisma.base_players.count(),
      prisma.matches.count(),
      prisma.seasons.count(),
      
      // Get recent transfers (reduced from 10 to 5)
      prisma.transfer_history.findMany({
        where: { status: 'ACTIVE' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          soldPrice: true,
          basePlayer: {
            select: {
              id: true,
              name: true
            }
          },
          team: {
            select: {
              id: true,
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
    ])

    // Get top teams only if active season exists
    const topTeams = activeSeason
      ? await prisma.season_teams.findMany({
          where: { seasonId: activeSeason.id },
          take: 4,
          orderBy: { currentBudget: 'desc' },
          select: {
            id: true,
            currentBudget: true,
            team: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            }
          }
        })
      : []

    return {
      activeSeason,
      stats: {
        teams: activeSeason?._count.seasonTeams || 0,
        players: totalPlayers,
        matches: totalMatches,
        seasons: totalSeasons
      },
      recentTransfers,
      topTeams
    }
  } catch (error) {
    console.error('Error fetching home data:', error)
    return {
      activeSeason: null,
      stats: { teams: 0, players: 0, matches: 0, seasons: 0 },
      recentTransfers: [],
      topTeams: []
    }
  }
}

export default async function HomePage() {
  const data = await getHomeData()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-26 pb-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#E8A800]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#FFB347]/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {data.activeSeason && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E8A800]/10 border border-[#E8A800]/20 mb-8">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB347] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFB347]"></span>
                  </span>
                  <span className="text-sm font-bold text-[#E8A800]">{data.activeSeason.name.toUpperCase()} LIVE</span>
                </div>
              )}

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight">
                Turf Cats
                <br />
                <span className="bg-gradient-to-r from-[#FFC93A] to-[#E8A800] bg-clip-text text-transparent">
                  eFootball League
                </span>
              </h1>

              <p className="text-xl text-[#D4CCBB] mb-10 max-w-2xl mx-auto leading-relaxed">
                Our private league for the squad. Track auctions, manage teams, and follow every match.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/teams"
                  className="px-8 py-4 bg-[#E8A800] hover:bg-[#FFC93A] text-[#0a0a0a] rounded-lg font-bold transition-all"
                >
                  View Teams
                </Link>
                <Link
                  href="/players"
                  className="px-8 py-4 bg-white/5 border border-[#C98F00] hover:bg-[#3D2A00] hover:border-[#E8A800] text-[#F5F0E8] rounded-lg font-bold transition-all"
                >
                  Browse Players
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-white/10 bg-[#111111]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-5xl font-black text-[#F5F0E8] mb-2">{data.stats.teams}</div>
                <div className="text-sm font-bold text-[#7A7367] uppercase tracking-wider">Active Teams</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-[#F5F0E8] mb-2">{data.stats.players}</div>
                <div className="text-sm font-bold text-[#7A7367] uppercase tracking-wider">Total Players</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-[#F5F0E8] mb-2">{data.stats.matches}</div>
                <div className="text-sm font-bold text-[#7A7367] uppercase tracking-wider">Matches Played</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-[#F5F0E8] mb-2">{data.stats.seasons}</div>
                <div className="text-sm font-bold text-[#7A7367] uppercase tracking-wider">Seasons</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-[#F5F0E8] mb-4">What We Track</h2>
              <p className="text-lg text-[#D4CCBB]">Everything you need to follow the league</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  title: 'Live Auctions',
                  description: 'Real-time bidding with instant budget updates during auction nights.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  title: 'Team Squads',
                  description: 'Complete rosters with player stats and transfer history for every team.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                  title: 'Player Database',
                  description: 'Every player with detailed stats and complete transfer records.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  ),
                  title: 'Tournaments',
                  description: 'Fixtures, standings, and results for all league tournaments.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  title: 'Budget Tracking',
                  description: 'Real-time budget calculations and financial history for each team.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ),
                  title: 'Retention System',
                  description: 'Pre-season player retention before each auction round.',
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="p-8 rounded-xl bg-[#111111] border border-white/10 hover:border-[#E8A800]/30 hover:bg-[#181818] transition-all"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-[#3D2A00] text-[#E8A800] mb-5">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-[#F5F0E8] mb-3">{feature.title}</h3>
                  <p className="text-[#D4CCBB] leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Transfers */}
        {data.recentTransfers.length > 0 && (
          <section className="py-24 px-6 lg:px-8 border-t border-white/10 bg-[#111111]">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-4xl font-black text-[#F5F0E8] mb-2">Recent Transfers</h2>
                  <p className="text-[#D4CCBB]">Latest player movements</p>
                </div>
                <Link href="/players" className="hidden sm:flex items-center gap-2 text-[#E8A800] font-bold hover:text-[#FFC93A] transition-colors">
                  View All
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              <div className="space-y-3">
                {data.recentTransfers.slice(0, 5).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-6 rounded-xl bg-[#181818] border border-white/10 hover:border-[#E8A800]/30 hover:bg-[#111111] transition-all"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-[#3D2A00] rounded-lg flex items-center justify-center text-[#E8A800] font-bold text-xs border border-[#C98F00]">
                        {transfer.basePlayer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-[#F5F0E8] font-bold mb-1">{transfer.basePlayer.name}</div>
                        <div className="text-[#7A7367] text-sm">{transfer.team.name} • {transfer.season.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#E8A800] font-bold">${(transfer.soldPrice / 1000000).toFixed(1)}M</span>
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
